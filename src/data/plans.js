import { z } from 'zod';
import { planSchema, nbnPlanSchema } from './schema.js';

export const SIM_PLANS = z.array(planSchema).parse([
  { name: 'BASIC', price: 23, data: '12GB', features: ['Unlimited national calls & text', 'No excess data charges', 'Unlimited international SMS', 'Data Banking', 'Data Gifting'] },
  { name: '5G PLUS', price: 35, data: '40GB', featured: true, features: ['Unlimited national calls, SMS & MMS', '5G access (where available)', 'Data Banking', 'Data Gifting'] },
  { name: '5G GLOBAL', price: 30, data: '30GB', features: ['Standard national call & text', 'International calling included', 'Standard national MMS', 'Data Banking', 'Data Gifting'] },
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

// Business-grade NBN plans (resold). `price` is the month-to-month list rate
// inc GST — no lock-in contracts. `bundle` is the 10%-off rate for TeleChoice
// mobile customers (new or existing).
export const NBN_PLANS = z.array(nbnPlanSchema).parse([
  { name: 'NBN 50/20', typical: '50/17 Mbps', price: 95, bundle: 85.5, blurb: 'For basic web, email & EFTPOS', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP', '2 free speed-upgrade days every month'] },
  { name: 'NBN 250/100', typical: '250/85 Mbps', price: 110, bundle: 99, featured: true, blurb: 'For VoIP calls, cloud apps & backups', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP', 'Enhanced service level agreement included'] },
  { name: 'NBN 500/50', typical: '500/40 Mbps', price: 105, bundle: 94.5, blurb: 'For video calls & fast downloads', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP', '2 free speed-upgrade days every month'] },
  { name: 'NBN 750/50', typical: '750/40 Mbps', price: 115, bundle: 103.5, blurb: 'For multi-user offices & cloud usage', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP'] },
  { name: 'NBN 1000/100', typical: '860/85 Mbps', price: 130, bundle: 117, blurb: 'For heavy downloads & many users', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP'] },
  { name: 'NBN 500/200', typical: '405/170 Mbps', price: 140, bundle: 126, blurb: 'For upload-heavy work — video, CCTV, sync', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP', 'Pro service level agreement included'] },
  { name: 'NBN 1000/400', typical: '860/340 Mbps', price: 165, bundle: 148.5, blurb: 'For serious upload & multi-site work', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP', 'Pro service level agreement included'] },
  { name: 'NBN 2000/200', typical: '1700/170 Mbps', price: 210, bundle: 189, blurb: 'For the fastest downloads available', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP'] },
  { name: 'NBN 2000/500', typical: '1700/425 Mbps', price: 260, bundle: 234, blurb: 'Our top plan — maximum everything', features: ['No lock-in — cancel anytime', 'Unlimited data', 'Free static IP', 'Pro service level agreement included'] },
]);
