# Express Repairs

Marketing site for Express Repairs — a phone repair shop. Single-page layout with:

- Hero + live 4-step booking widget (brand → model → issue → quote → details)
- Bento-grid repair services
- SIM & handset plan cards with toggle
- Accessories
- Brand strip (Apple, Samsung, Google, Oppo, Huawei, Motorola)
- Why-us, testimonials, warranty, FAQ
- Store info, contact form, footer

## Stack

Static HTML + CSS + React (via UMD + Babel standalone). No build step. Open `index.html` in a browser or serve with any static server.

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Customising

Copy, images, phone number, and address live in [`src/data.jsx`](src/data.jsx) under the `SITE` object and the individual content arrays. Design tokens (palette, fonts, radii, shadows) are in [`styles.css`](styles.css) under `:root`. Swap palettes by changing the `data-palette` attribute on `<html>` in `index.html` — `electric-blue`, `crimson`, `emerald`, `navy-orange`, `midnight-lime`, `magenta` are all defined.

## Structure

```
index.html           entry + CDN imports
styles.css           design tokens, layout, components
src/
  data.jsx           content (brands, issues, plans, FAQs, testimonials, SITE info)
  icons.jsx          inline SVG icon set + brand logos
  booking.jsx        5-step quote flow
  sections.jsx       Nav, Hero, Repairs, Plans, Accessories
  sections2.jsx      Brands, WhyUs, Testimonials, Warranty, FAQ, Store, Contact, Footer
  app.jsx            composition root
```

## Deploy

Works out-of-the-box on GitHub Pages, Netlify, Vercel, or any static host — no build, no env vars.
