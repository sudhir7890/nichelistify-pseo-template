// scripts/generate-new-niche.js

const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');

// 𝗖𝗵𝗮𝗻𝗴𝗲: Import OpenAI as a class
const OpenAI = require('openai');
require('dotenv').config();

// --- Config from environment ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AFFILIATE_BASE_URL = process.env.AFFILIATE_BASE_URL || '';
if (!OPENAI_API_KEY) {
  console.error('❌  Missing OPENAI_API_KEY. Please set it in .env.local or GitHub Secrets.');
  process.exit(1);
}

// 𝗖𝗵𝗮𝗻𝗴𝗲: Instantiate OpenAI client directly
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Slugify helper
function slugify(raw) {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Capitalize helper
function capitalize(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Read all cities
const citiesFile = fs.readFileSync(path.join(__dirname, '../cities.txt'), 'utf-8');
const allCities = citiesFile.split('\n').map((c) => c.trim()).filter(Boolean);

// Niche argument
const nicheRaw = process.argv[2];
if (!nicheRaw) {
  console.error('❌  Missing niche argument. Usage: npm run generate:new-niche <niche>');
  process.exit(1);
}
const niche = slugify(nicheRaw);

// Build Yelp RSS URL
function getYelpRSSUrl(citySlug, niche) {
  const query = niche.replace(/[^a-z0-9]+/g, '+');
  const displayCity = capitalize(citySlug);
  return `https://www.yelp.com/rss/search?find_desc=${query}&find_loc=${encodeURIComponent(
    displayCity + ', NC'
  )}`;
}

// Fetch & rank top 10
async function fetchAndRank(citySlug, niche) {
  const parser = new Parser();
  const url = getYelpRSSUrl(citySlug, niche);
  let feed;
  try {
    feed = await parser.parseURL(url);
  } catch (err) {
    console.error(`⚠️  Failed RSS fetch for ${citySlug}/${niche}: ${err.message}`);
    return [];
  }

  const listings = feed.items.map((item) => {
    const title = item.title || '';
    const [namePart, metaPart] = title.split('–').map((s) => s.trim());
    let rating = 0,
      reviewCount = 0;
    if (metaPart) {
      const stars = (metaPart.match(/★/g) || []).length;
      const half = metaPart.includes('½') ? 0.5 : 0;
      rating = stars + half;
      const countMatch = metaPart.match(/(\d+)\s+reviews?/i);
      if (countMatch) reviewCount = parseInt(countMatch[1], 10);
    }
    return {
      name: namePart || 'Unknown',
      rating,
      reviewCount,
      link: item.link || '',
    };
  });

  const filtered = listings.filter((b) => b.rating >= 3.5 && b.reviewCount >= 50);
  const ranked = filtered
    .map((b) => ({ ...b, score: b.rating * Math.log(b.reviewCount + 1) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return ranked;
}

// Build GPT-4 Markdown
async function buildMarkdown(citySlug, niche, topBusinesses) {
  const displayCity = capitalize(citySlug);
  const nicheWords = niche.replace(/-/g, ' ');
  const nichePlural = nicheWords;
  const nicheSingular = nicheWords.replace(/s$/, '');

  const businessLines = topBusinesses
    .map((b, i) => {
      const targetUrl = AFFILIATE_BASE_URL
        ? `${AFFILIATE_BASE_URL}${encodeURIComponent(b.link)}`
        : b.link;
      return `${i + 1}. ${b.name} | ${b.rating.toFixed(1)} | ${b.reviewCount} | ${targetUrl}`;
    })
    .join('\n');

  const prompt = `
You are an expert local guide writing an SEO-optimized article. Generate a "Best ${nichePlural} in ${displayCity}, NC (2025 Guide)" in valid Markdown.

1. **Introduction (600–800 words)**
   - Must include these keywords at least once:
     • "${nichePlural} near me"
     • "cozy ${nichePlural} ${displayCity}"
     • "${nicheSingular} in ${displayCity} NC"

2. **Top 10 Listings**
   For each of the following 10 businesses, write a 2–3 sentence description mentioning a local landmark (e.g., "near Moore Square") and include a CTA "[Reserve at AFFILIATE_LINK]":
   Format each like:
   > ## 1. Business Name
   > **Rating:** X.X (Y reviews)
   > Description...

   Here are the businesses (Name | Rating | Reviews | Link):
${businessLines}

3. **FAQs**
   At the end, add a "### FAQs" section with exactly two Q&A:
   - "What is the typical cost to visit a ${nicheSingular} in ${displayCity}?"
   - "Do these ${nichePlural} allow walk-ins, or do I need a reservation?"

Output only valid Markdown.
`;

  // 𝗖𝗵𝗮𝗻𝗴𝗲: Use openai.chat.completions.create() on the new client
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });
      // In v4, choices[0].message.content is:
      return completion.choices[0].message.content;
    } catch (e) {
      console.error(
        `⚠️  GPT-4 call failed for ${citySlug}/${niche} (attempt ${attempt}): ${e.message}`
      );
      if (attempt === MAX_RETRIES) throw e;
      await new Promise((r) => setTimeout(r, attempt * attempt * 2000));
    }
  }
}

(async () => {
  const BATCH_SIZE = 50;
  const BATCH_DELAY_MS = 10000;
  let successCount = 0,
    skipCount = 0,
    errorCount = 0;

  function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  const cityBatches = chunkArray(allCities, BATCH_SIZE);

  for (const [batchIdx, cityBatch] of cityBatches.entries()) {
    await Promise.all(
      cityBatch.map(async (rawCity) => {
        const citySlug = slugify(rawCity);

        try {
          console.log(`⏳ Fetch & rank: ${citySlug}/${niche}`);
          const top10 = await fetchAndRank(citySlug, niche);

          if (!top10.length) {
            console.log(`⚠️  No listings for ${citySlug}/${niche}. Creating stub.`);
            const displayCity = capitalize(citySlug);
            const frontmatter = `---
title: "No ${niche.replace(/-/g, ' ')} Found in ${displayCity}, NC"
description: "Currently, there are no ${niche.replace(/-/g, ' ')} in ${displayCity}, NC."
---

`;
            const suggestions = allCities
              .filter((c) => c !== citySlug)
              .slice(0, 3)
              .map((c) => `- [${capitalize(c)}](/${c}/${niche})`)
              .join('\n');

            const body = `
**We couldn’t find any ${niche.replace(/-/g, ' ')} in ${displayCity}, NC at this time.**  
Check these nearby cities instead:

${suggestions}

Check back soon—if a new ${niche.replace(/-/g, ' ')} opens, we’ll add it here.
`;
            const dataDir = path.join(__dirname, '../data');
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
            const filename = path.join(dataDir, `${citySlug}_${niche}.md`);
            fs.writeFileSync(filename, frontmatter + body);
            skipCount++;
            return;
          }

          console.log(`⏳ Generating Markdown for ${citySlug}/${niche}`);
          let markdown = await buildMarkdown(citySlug, niche, top10);

          // Append JSON-LD LocalBusiness
          top10.forEach((b) => {
            const targetUrl = AFFILIATE_BASE_URL
              ? `${AFFILIATE_BASE_URL}${encodeURIComponent(b.link)}`
              : b.link;
            const lbSchema = {
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "name": b.name,
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": b.rating.toFixed(1),
                "reviewCount": b.reviewCount
              },
              "url": targetUrl
            };
            markdown += `\n\n<script type="application/ld+json">\n${JSON.stringify(
              lbSchema,
              null,
              2
            )}\n</script>\n`;
          });

          // Append FAQ JSON-LD
          const displayCity = capitalize(citySlug);
          const faqSchema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": `What is the typical cost to visit a ${niche.replace(
                  /-/g,
                  ' '
                )} in ${displayCity}?`,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Admission typically ranges from $10–$15 per hour. Be sure to check each location’s policy."
                }
              },
              {
                "@type": "Question",
                "name": `Do these ${niche.replace(
                  /-/g,
                  ' '
                )} allow walk-ins, or do I need a reservation?`,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Most busy weekends require reservations. We recommend booking 2–3 days in advance."
                }
              }
            ]
          };
          markdown += `\n\n<script type="application/ld+json">\n${JSON.stringify(
            faqSchema,
            null,
            2
          )}\n</script>\n`;

          const frontmatter = `---
title: "Best ${niche.replace(/-/g, ' ')} in ${displayCity}, NC (2025 Guide)"
description: "Discover the top ${niche.replace(/-/g, ' ')} in ${displayCity}, NC."
---

`;
          const dataDir = path.join(__dirname, '../data');
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
          const filename = path.join(dataDir, `${citySlug}_${niche}.md`);
          fs.writeFileSync(filename, frontmatter + markdown);
          successCount++;
        } catch (err) {
          console.error(`❌ Error for ${slugify(rawCity)}/${niche}: ${err.message}`);
          errorCount++;
        }
      })
    );

    console.log(
      `🛑 Batch ${batchIdx + 1}/${cityBatches.length} complete. Sleeping ${BATCH_DELAY_MS / 1000}s…`
    );
    await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }

  console.log(
    `✅ Completed generate-new-niche "${niche}". Success: ${successCount}, Skipped: ${skipCount}, Errors: ${errorCount}`
  );
})();
