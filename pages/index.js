// pages/index.js
import fs from 'fs';
import path from 'path';

export async function getStaticProps() {
  const citiesFile = fs.readFileSync(path.join(process.cwd(), 'cities.txt'), 'utf-8');
  const cities = citiesFile.split('\n').map((c) => c.trim()).filter(Boolean);

  const nichesFile = fs.readFileSync(path.join(process.cwd(), 'active_niches.txt'), 'utf-8');
  const niches = nichesFile.split('\n').map((n) => n.trim()).filter(Boolean);

  return { props: { cities, niches } };
}

export default function Home({ cities, niches }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Directory Home</h1>
      <p>Click a city and category to view listings.</p>

      <div style={{ display: 'flex', gap: '2rem' }}>
        <div>
          <h2>Cities</h2>
          <ul>
            {cities.map((city) => (
              <li key={city}>
                {city
                  .split('-')
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ')}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Categories</h2>
          <ul>
            {niches.map((niche) => (
              <li key={niche}>{niche.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</li>
            ))}
          </ul>
        </div>
      </div>

      <p>
        To visit a page, enter <code>/[city-slug]/[niche-slug]</code> in the URL bar (e.g., <code>/raleigh/catcafes</code>).
      </p>
    </div>
  );
}
