import { z } from 'zod';
import { planSchema } from './schema.js';

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
