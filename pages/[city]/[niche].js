// pages/[city]/[niche].js
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import React from 'react';
import ReactMarkdown from 'react-markdown';

export async function getStaticPaths() {
  const citiesFile = fs.readFileSync(path.join(process.cwd(), 'cities.txt'), 'utf-8');
  const cities = citiesFile.split('\n').map((c) => c.trim()).filter(Boolean);

  const nichesFile = fs.readFileSync(path.join(process.cwd(), 'active_niches.txt'), 'utf-8');
  const niches = nichesFile.split('\n').map((n) => n.trim()).filter(Boolean);

  const paths = [];
  for (const city of cities) {
    for (const niche of niches) {
      paths.push({ params: { city, niche } });
    }
  }
  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const { city, niche } = params;
  const filePath = path.join(process.cwd(), 'data', `${city}_${niche}.md`);

  if (!fs.existsSync(filePath)) {
    return { notFound: true };
  }

  const fileContents = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content } = matter(fileContents);

  return {
    props: { frontmatter, content, city, niche },
  };
}

export default function DirectoryPage({ frontmatter, content, city, niche }) {
  const displayCity = city
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  if (!content) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>{frontmatter?.title || `Best ${niche.replace(/-/g, ' ')} in ${displayCity}`}</h1>
        <p>This page is being generated for the first time. Please check back in a few minutes!</p>
      </div>
    );
  }

  return (
    <article style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1>{frontmatter.title}</h1>
      {frontmatter.description && <p><em>{frontmatter.description}</em></p>}
      <ReactMarkdown>{content}</ReactMarkdown>

      {/* “More Categories in {City}” */}
      <footer style={{ marginTop: '2rem' }}>
        <h3>More Categories in {displayCity}</h3>
        <ul>
          {(() => {
            const nichesFile = fs.readFileSync(path.join(process.cwd(), 'active_niches.txt'), 'utf-8');
            const activeNiches = nichesFile.split('\n').map((n) => n.trim()).filter(Boolean);
            return activeNiches
              .filter((n) => n !== niche)
              .slice(0, 5)
              .map((other) => (
                <li key={other}>
                  <a href={`/${city}/${other}`}>{other.replace(/-/g, ' ')}</a>
                </li>
              ));
          })()}
        </ul>
      </footer>
    </article>
  );
}
