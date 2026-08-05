import { z } from 'zod';
import { testimonialSchema } from './schema.js';

// The ONLY place a customer review may live. Every review rendered anywhere on
// this site comes from here.
//
// Why one array: for six weeks the homepage and the suburb pages kept separate
// lists, and only the suburb list was ever audited. The June 2026 cleanup
// replaced the fabricated suburb testimonials with these real ones and left the
// same invented names sitting on the homepage; PR #70 then removed the three
// labelled "Verified Customer" and left three labelled "Google Review", because
// it matched on the label rather than on whether the review was attributable.
// A second array is a place a fake can hide, so there is no second array.
//
// Rules for editing this file:
//   - Every entry must be a real review, quoted from the Google Business
//     Profile, attributable to the name shown. Unverified is treated as
//     fabricated — leave it out.
//   - `source` is always 'Google Review'. tests/data.test.js enforces it.
//   - The suburb template hardcodes ★★★★★, so only genuine 5-star reviews
//     belong here.
//   - Never pair these with stock or AI-generated faces. Initials only.
//
// Verified against the store's Google Business Profile on 2026-06-24.
export const VERIFIED_REVIEWS = z.array(testimonialSchema).parse([
  { initials: 'MD', name: 'Margaret Dasivla', source: 'Google Review', text: "I fixed my iPhone 7 Plus screen and battery here. It was done within 20 mins and works perfect now. I'm very happy." },
  { initials: 'MT', name: 'Margad T.', source: 'Google Review', text: 'Avi helped me with my phone when I needed help. This store has really good customer service — they do iPhone repairs very time efficiently and to the best quality.' },
  { initials: 'NB', name: 'Natasa Bejatovic', source: 'Google Review', text: 'All staff is very professional, friendly, always ready for help. I am with them almost 20 years and I will always stay with them.' },
  { initials: 'SA', name: 'Sagar Acharya', source: 'Google Review', text: 'They are the best in Australia. Love the customer service. You have to wait a bit longer but totally worth it.' },
  { initials: 'KK', name: 'Kathleen Kennedy', source: 'Google Review', text: "Fabulous service, with a smile. Shop locally — you'll be glad you did." },
  { initials: 'JD', name: 'Jennifer Dungo', source: 'Google Review', text: 'Very good service and staff. They are very friendly and approachable. Nice transaction.' },
]);
