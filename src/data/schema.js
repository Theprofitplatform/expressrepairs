import { z } from 'zod';

// NOTE: these must stay in sync with the brand `id`s in ./brands.js — adding a
// brand there requires adding its id here, or issue pricing won't be validated.
const brandIds = ['apple', 'samsung', 'google', 'oppo', 'huawei', 'motorola', 'other'];
const priceMap = z.object(Object.fromEntries(brandIds.map((id) => [id, z.number()])));

export const brandSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string(),
  models: z.array(z.string()).min(1),
});

export const issueSchema = z.object({
  id: z.string(),
  label: z.string(),
  emoji: z.string(),
  basePrice: priceMap,
});

export const repairCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  desc: z.string(),
  from: z.string(),
  img: z.string(),
  tag: z.string().optional(),
  size: z.string(),
});

export const planSchema = z.object({
  name: z.string(),
  price: z.number(),
  data: z.string(),
  featured: z.boolean().optional(),
  features: z.array(z.string()).min(1),
});

export const nbnPlanSchema = z.object({
  name: z.string(),
  typical: z.string(), // supplier's "Typical Business Hour Speed", verbatim
  price: z.number(), // list $/month inc GST, month-to-month (no lock-in)
  bundle: z.number(), // TeleChoice mobile customer price = price × 0.9
  featured: z.boolean().optional(),
  blurb: z.string(),
  features: z.array(z.string()).min(1),
});

export const accessorySchema = z.object({
  title: z.string(),
  desc: z.string(),
  price: z.string(),
  img: z.string(),
  tag: z.string().optional(),
});

export const brandTileSchema = z.object({ id: z.string(), name: z.string(), sub: z.string() });
export const testimonialSchema = z.object({ name: z.string(), source: z.string(), initials: z.string(), text: z.string() });
export const warrantySchema = z.object({ title: z.string(), desc: z.string() });
export const faqSchema = z.object({ q: z.string(), a: z.string() });
export const landingPageSchema = z.object({
  slug: z.string(),
  service: z.string().nullable(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  h1: z.string(),
  sub: z.string(),
  offer: z.string(),
  fromCaption: z.string().optional(),
  fromAmount: z.string().optional(),
  faqs: z.array(faqSchema).optional(),
});
export const hoursSchema = z.object({ day: z.string(), hrs: z.string(), dow: z.number().min(0).max(6) });

export const siteSchema = z.object({
  name: z.string(),
  storeName: z.string(),
  storeSub: z.string(),
  phone: z.string(),
  phoneHref: z.string().startsWith('tel:'),
  landline: z.string(),
  landlineHref: z.string().startsWith('tel:'),
  addressLines: z.array(z.string()).min(1),
  addressShort: z.string(),
  mapsQuery: z.string(),
  tagline: z.string(),
  address: z.object({
    locality: z.string(),
    region: z.string(),
    postalCode: z.string(),
    country: z.string(),
  }),
  geo: z.object({ lat: z.number(), lng: z.number() }),
  // Optional structured-data extras.
  image: z.string().optional(),
  logo: z.string().optional(),
  priceRange: z.string().optional(),
  sameAs: z.array(z.string()).optional(),
  // aggregateRating: only emitted in JSON-LD when `count` is a real number > 0.
  rating: z
    .object({ value: z.number(), count: z.number().nullable(), best: z.number().default(5) })
    .optional(),
});

// One synced DXPOS product shown in /shop. Written by scripts/sync-products.mjs
// — never hand-edit products.json; change the product in DXPOS instead.
export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  // Supplier's category.name (usually a brand: Apple / Samsung / …); may be
  // internal jargon. Filter on it, never render it as a category. Defaults ''
  // so products.json synced before this field existed still validates.
  brand: z.string().default(''),
  priceCents: z.number().int().positive(),
  // Hotlinked from the supplier catalogue — full URL, not a repo-local path.
  image: z.string().url(),
  thumb: z.string(),
  inStock: z.boolean(),
  sku: z.string(),
  // Derived at build time from name+category (src/lib/tags.js) — never stored
  // in products.json, so syncs can't wipe it.
  tags: z.array(z.string()).default([]),
});
