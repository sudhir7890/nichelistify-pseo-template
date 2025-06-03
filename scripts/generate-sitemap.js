// scripts/generate-sitemap.js

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://yourdomain.com'; // ← Replace with your actual domain
const dataDir = path.join(__dirname, '../data');
const publicDir = path.join(__dirname, '../public');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const files = fs.existsSync(dataDir)
  ? fs.readdirSync(dataDir).filter((f) => f.endsWith('.md'))
  : [];

const urls = files.map((filename) => {
  const [city, nicheWithExt] = filename.split('_');
  const niche = nicheWithExt.replace('.md', '');
  return `${BASE_URL}/${city}/${niche}`;
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml);
console.log(`✅ sitemap.xml generated with ${urls.length} URLs.`);
