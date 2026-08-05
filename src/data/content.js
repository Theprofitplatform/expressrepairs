import { z } from 'zod';
import { warrantySchema, faqSchema, hoursSchema } from './schema.js';
import { VERIFIED_REVIEWS } from './reviews.js';

// The homepage shows the first three verified reviews. It does NOT keep its own
// list — see src/data/reviews.js for why that matters.
//
// Removed 2026-08-05: Livio Bruno, Rikki Thomson and Teri Elley, which had sat
// here labelled "Google Review". None appear among the reviewers verified
// against the Google Business Profile, and the first two were the fabricated
// testimonials the June 2026 suburb-page audit removed — they survived here
// only because this array was never audited. Unverified is treated as
// fabricated.
export const TESTIMONIALS = VERIFIED_REVIEWS.slice(0, 3);

export const WARRANTIES = z.array(warrantySchema).parse([
  { title: '6–12 Month Warranty', desc: 'All repairs covered by manufacturer-grade warranty.' },
  { title: 'Original-Quality Parts', desc: 'Genuine OEM or premium aftermarket, always.' },
  { title: 'Free Diagnostics', desc: 'No charge for phone assessment and quote.' },
  { title: 'Same-Day Service', desc: 'Most repairs completed in 30–90 minutes.' },
]);

export const FAQS = z.array(faqSchema).parse([
  { q: 'How long does a typical repair take?', a: "Most repairs — screen replacements, battery swaps — are completed within 30–90 minutes. More complex repairs like water damage may take 2–4 hours. We'll give you a firm time estimate the moment you walk in." },
  { q: 'Do you use genuine parts?', a: 'We use a combination of genuine OEM parts and premium aftermarket parts that meet or exceed original specifications. Every part is warrantied and thoroughly tested before installation.' },
  { q: "What's covered under warranty?", a: "Our warranty covers defects in parts and workmanship for 6–12 months depending on repair type. It doesn't cover physical damage, water damage, or issues caused by misuse after the repair." },
  { q: 'Do I need an appointment?', a: "Walk-ins are always welcome. Booking ahead just guarantees we'll have your parts in stock and gets you served faster. Call us or use the quote form below." },
  { q: 'Will my data be safe during repair?', a: "Yes — we don't need to access your data for most repairs. We still recommend backing up your device before any service as a precaution." },
  { q: 'What payment methods do you accept?', a: 'Cash, all major credit cards (Visa, Mastercard, Amex), debit cards, and digital payments including Apple Pay and Google Pay.' },
]);

// Real trading hours — Riverwood Plaza shop. Weekdays 9–6, Thu late-night to 7,
// Sat 9–5, closed Sunday (confirmed by Avi). 'Closed' days carry no time range.
export const HOURS = z.array(hoursSchema).parse([
  { day: 'Monday', hrs: '9:00 AM – 6:00 PM', dow: 1 },
  { day: 'Tuesday', hrs: '9:00 AM – 6:00 PM', dow: 2 },
  { day: 'Wednesday', hrs: '9:00 AM – 6:00 PM', dow: 3 },
  { day: 'Thursday', hrs: '9:00 AM – 7:00 PM', dow: 4 },
  { day: 'Friday', hrs: '9:00 AM – 6:00 PM', dow: 5 },
  { day: 'Saturday', hrs: '9:00 AM – 5:00 PM', dow: 6 },
  { day: 'Sunday', hrs: 'Closed', dow: 0 },
]);
