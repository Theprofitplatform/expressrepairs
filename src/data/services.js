import { z } from 'zod';
import { issueSchema, repairCardSchema } from './schema.js';

export const ISSUES = z.array(issueSchema).parse([
  { id: 'screen', label: 'Screen Repair', emoji: '📱', basePrice: { apple: 149, samsung: 169, google: 129, oppo: 99, huawei: 119, motorola: 99 } },
  { id: 'battery', label: 'Battery', emoji: '🔋', basePrice: { apple: 79, samsung: 89, google: 69, oppo: 59, huawei: 69, motorola: 59 } },
  { id: 'backglass', label: 'Back Glass', emoji: '✨', basePrice: { apple: 89, samsung: 99, google: 79, oppo: 69, huawei: 79, motorola: 69 } },
  { id: 'port', label: 'Charging Port', emoji: '🔌', basePrice: { apple: 69, samsung: 79, google: 59, oppo: 49, huawei: 59, motorola: 49 } },
  { id: 'camera', label: 'Camera', emoji: '📸', basePrice: { apple: 99, samsung: 119, google: 89, oppo: 79, huawei: 89, motorola: 79 } },
  { id: 'water', label: 'Water Damage', emoji: '💧', basePrice: { apple: 129, samsung: 149, google: 119, oppo: 99, huawei: 109, motorola: 99 } },
  { id: 'speaker', label: 'Speaker', emoji: '🔊', basePrice: { apple: 69, samsung: 79, google: 59, oppo: 49, huawei: 59, motorola: 49 } },
  { id: 'diagnostic', label: 'Free Diagnostic', emoji: '🔍', basePrice: { apple: 0, samsung: 0, google: 0, oppo: 0, huawei: 0, motorola: 0 } },
  { id: 'other', label: 'Other', emoji: '🛠️', basePrice: { apple: 0, samsung: 0, google: 0, oppo: 0, huawei: 0, motorola: 0 } },
]);

export const REPAIR_CARDS = z.array(repairCardSchema).parse([
  { id: 'screen', title: 'Screen Repair', desc: 'Cracked or shattered? Back to mint in under an hour.', from: 'from $99', img: '/images/screen-repair.jpg', tag: 'Most Popular', size: 'hero' },
  { id: 'battery', title: 'Battery Replacement', desc: 'Fresh cells so you stop chasing power outlets.', from: 'from $59', img: '/images/battery-repair.jpg', size: 'tall' },
  { id: 'backglass', title: 'Back Glass', desc: 'Restore the finish — no shards, no sharp edges.', from: 'from $69', img: '/images/glass-repair.jpg', size: 'small' },
  { id: 'port', title: 'Charging Port', desc: 'Finicky cable? We clean or replace it, fast.', from: 'from $49', img: '/images/port-repair.jpg', size: 'small' },
  { id: 'other', title: 'Other Repairs', desc: "Water damage, speakers, cameras — we've seen it all.", from: 'custom quote', img: '/images/other-repairs.jpg', size: 'wide' },
  { id: 'diagnostic', title: 'Free Diagnostic', desc: "Not sure what's wrong? Bring it in, no charge.", from: 'free', img: '/images/diagnostic.jpg', tag: 'Free', size: 'small' },
]);
