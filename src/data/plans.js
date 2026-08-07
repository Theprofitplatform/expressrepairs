import { z } from 'zod';
import { planSchema, nbnPlanSchema } from './schema.js';

export const SIM_PLANS = z.array(planSchema).parse([
  { name: 'BASIC', price: 23, data: '12GB', features: ['Unlimited national calls & text', 'No excess data charges', 'Unlimited international SMS', 'Data Banking', 'Data Gifting'] },
  { name: '5G GLOBAL', price: 30, data: '30GB', features: ['Standard national call & text', 'International calling included', 'Standard national MMS', 'Data Banking', 'Data Gifting'] },
  { name: '5G PLUS', price: 35, data: '40GB', featured: true, features: ['Unlimited national calls, SMS & MMS', '5G access (where available)', 'Data Banking', 'Data Gifting'] },
  { name: '5G ADVANCED', price: 42, data: '75GB', features: ['Unlimited national calls, SMS & MMS', '5G access (where available)', 'International calling (20 countries)', 'Data Banking & Gifting'] },
  { name: '5G PREMIUM', price: 52, data: '120GB', features: ['Unlimited national calls, SMS & MMS', '5G access (where available)', 'International calling (20 countries)', 'Data Banking & Gifting'] },
  { name: '5G ULTIMATE', price: 59, data: '160GB', features: ['Standard national call & text', 'International calling (20 countries)', 'Standard MMS & Video MMS', 'Data Banking & Gifting'] },
]);

export const HANDSET_PLANS = z.array(planSchema).parse([
  { name: 'BASIC', price: 49, data: '12GB', features: ['+ Up to 500GB Data Bank', '+ Up to 2000 MMS', 'Unlimited Talk & Text (AU)', 'Trusted mobile network', 'Data Gifting up to 50%'] },
  { name: 'GLOBAL', price: 57, data: '30GB', features: ['Download speeds capped at 150Mbps', '+ Up to 500GB Data Bank', 'Unlimited Talk & Text (AU)', 'International calls to 20 countries', '"Unlimited" international calls included', 'Data Banking up to 1000GB'] },
  { name: 'ADVANCE', price: 67, data: '75GB', featured: true, features: ['Download speeds capped at 250Mbps', '+ Up to 1000GB Data Bank', 'Unlimited Talk & Text (AU)', 'International calls to 20 countries', '"Unlimited" international calls included', 'Data Gifting up to 50%'] },
  { name: 'ULTIMATE', price: 84, data: '160GB', features: ['Download speeds capped at 250Mbps', '+ Up to 1000GB Data Bank', 'Unlimited Talk & Text (AU)', 'International calls to 20 countries', '"Unlimited" international calls included', 'Data Gifting up to 50%'] },
]);

// NBN plans for home & business (resold). `price` is the month-to-month list rate
// inc GST — no lock-in contracts, and the rate every plan reverts to at month 7.
//
// Every new connection gets a flat $5/mth off for its first 6 months, so the
// advertised price is `price - NBN_INTRO_OFF` and `price` is what the card
// strikes through. A flat amount rather than a field on all nine plans: there
// is one offer, not nine. Give a plan its own field only if one ever differs.
// ponytail: the separate ongoing $5 for customers with an eligible phone plan
// is deliberately NOT modelled here — it is conditional and resolved in store,
// so no price on the site may assume it.
export const NBN_INTRO_OFF = 5;
export const NBN_INTRO_MONTHS = 6;

export const NBN_PLANS = z.array(nbnPlanSchema).parse([
  { name: 'NBN 50/20', typical: '50/17 Mbps', price: 94, blurb: 'For basic web, email & streaming', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP', '2 free speed-upgrade days every month'] },
  { name: 'NBN 250/100', typical: '250/85 Mbps', price: 109, blurb: 'For VoIP calls, cloud apps & backups', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP', 'Enhanced service level agreement included', '2 free speed-upgrade days every month'] },
  { name: 'NBN 500/50', typical: '500/40 Mbps', price: 104, featured: true, blurb: 'For video calls & fast downloads', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP', '2 free speed-upgrade days every month'] },
  { name: 'NBN 750/50', typical: '750/40 Mbps', price: 114, blurb: 'For busy households & offices', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP', '2 free speed-upgrade days every month'] },
  { name: 'NBN 1000/100', typical: '860/85 Mbps', price: 129, blurb: 'For gamers, heavy downloads & many users', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP'] },
  { name: 'NBN 500/200', typical: '500/170 Mbps', price: 139, blurb: 'For upload-heavy work — video, CCTV, sync', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP', 'Pro service level agreement included'] },
  { name: 'NBN 1000/400', typical: '860/340 Mbps', price: 163, blurb: 'For serious upload & multi-site work', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP', 'Pro service level agreement included'] },
  { name: 'NBN 2000/200', typical: '1700/170 Mbps', price: 209, blurb: 'For the fastest downloads available', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP'] },
  { name: 'NBN 2000/500', typical: '1700/425 Mbps', price: 259, blurb: 'Our top plan — maximum everything', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP', 'Pro service level agreement included'] },
]);
