import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

let html = '';
beforeAll(() => {
  // Cold Astro build can take ~60-90s; allow generous headroom.
  execSync('npm run build', { stdio: 'inherit' });
  html = readFileSync('dist/index.html', 'utf8');
}, 120000);

function jsonLdBlocks(markup) {
  return [...markup.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]));
}

describe('built homepage', () => {
  it('has the canonical tag', () => {
    expect(html).toContain('rel="canonical" href="https://expressrepairs.com.au/"');
  });
  it('server-renders core content (not a blank SPA shell)', () => {
    expect(html).toContain('1300 373 773');
    expect(html).toContain('Get a free quote');
  });
  it('includes LocalBusiness and FAQ JSON-LD (parsed, order-independent)', () => {
    const types = jsonLdBlocks(html).map((b) => b['@type']);
    expect(types).toContain('LocalBusiness');
    expect(types).toContain('FAQPage');
  });
  it('does NOT load Babel standalone or unpkg React (the old SPA stack)', () => {
    expect(html).not.toContain('@babel/standalone');
    expect(html).not.toContain('unpkg.com/react');
  });
  it('emitted a sitemap and a real 404 page', () => {
    expect(existsSync('dist/sitemap-index.xml')).toBe(true);
    expect(existsSync('dist/404.html')).toBe(true);
  });
});
