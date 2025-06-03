# NicheListify PSEO Template (with AdSense, Affiliate & Umami Analytics)

A fully automated PSEO engine that:

- **Weekly**:  
  1) Adds one new niche from `niches_master.txt` → `active_niches.txt`  
  2) Scrapes all ~19 500 cities for that niche via Yelp RSS → filters top 10  
  3) Calls GPT-4 to generate SEO-optimized Markdown (with affiliate links)  
  4) Injects JSON-LD for LocalBusiness & FAQ  
  5) Generates or updates `public/sitemap.xml`  
  6) Commits only the new pages + sitemap → Vercel auto-deploys  

- **Six-Month**: (Optional) Re-scrapes & re-generates all active niches → updates `sitemap.xml` → redeploys.

- **Monetization & Tracking**:  
  • **AdSense** (if `NEXT_PUBLIC_ADSENSE_CLIENT_ID` is set)  
  • **Affiliate Links** (prefix via `AFFILIATE_BASE_URL`)  
  • **Umami Analytics** (via `NEXT_PUBLIC_UMAMI_WEBSITE_ID`)

---

## Setup Instructions

1. **Copy `.env.example` → `.env.local`** (or set in Vercel env vars):
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   AFFILIATE_BASE_URL=https://affiliate.example.com/track?aff_id=YOUR_AFF_ID&url=
   NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
   NEXT_PUBLIC_UMAMI_WEBSITE_ID=your_umami_website_id_here
