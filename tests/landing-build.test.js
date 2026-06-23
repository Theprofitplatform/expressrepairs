import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

beforeAll(() => {
  // Cold Astro build can take ~60-90s; allow generous headroom.
  execSync('npm run build', { stdio: 'inherit' });
}, 180000);

const SLUGS = ['screen-repair', 'battery', 'water-damage', 'repairs'];

describe('built ad landing pages', () => {
  it('builds all four /go/ pages', () => {
    for (const s of SLUGS) expect(existsSync(`dist/go/${s}/index.html`), s).toBe(true);
  });

  it('every landing page is noindex,nofollow', () => {
    for (const s of SLUGS) {
      const html = readFileSync(`dist/go/${s}/index.html`, 'utf8');
      expect(html, s).toContain('name="robots" content="noindex, nofollow"');
    }
  });

  it('leads with a tap-to-call link to the shop phone and shows the offer', () => {
    const html = readFileSync('dist/go/screen-repair/index.html', 'utf8');
    expect(html).toContain('href="tel:+61295333300"');
    expect(html).toContain('(02) 9533 3300');
    expect(html).toContain('Free diagnostic');
  });

  it('ships no tracking snippet while tag IDs are empty (the default)', () => {
    const html = readFileSync('dist/go/screen-repair/index.html', 'utf8');
    expect(html).not.toContain('googletagmanager.com/gtag');
    expect(html).not.toContain('fbevents.js');
  });

  it('does not fabricate a star rating / review count', () => {
    const html = readFileSync('dist/go/screen-repair/index.html', 'utf8');
    expect(html).not.toContain('aggregateRating');
  });

  it('excludes /go/ landing pages from the sitemap', () => {
    const xml = ['dist/sitemap-0.xml', 'dist/sitemap-1.xml']
      .filter(existsSync)
      .map((p) => readFileSync(p, 'utf8'))
      .join('');
    expect(xml).toContain('/repairs/'); // sanity: the sitemap has real content
    expect(xml).not.toContain('/go/');
  });
});
