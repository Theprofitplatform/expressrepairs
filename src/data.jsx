// Shared content for Express Repairs site

const BRANDS = [
  { id: 'apple', name: 'Apple', logo: '', models: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 12', 'iPhone 11', 'iPhone XR', 'iPhone SE'] },
  { id: 'samsung', name: 'Samsung', logo: 'S', models: ['Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy S23 Ultra', 'Galaxy S23', 'Galaxy S22', 'Galaxy Z Fold5', 'Galaxy Z Flip5', 'Galaxy A54', 'Galaxy A34', 'Galaxy Note 20'] },
  { id: 'google', name: 'Google', logo: 'G', models: ['Pixel 8 Pro', 'Pixel 8', 'Pixel 7 Pro', 'Pixel 7', 'Pixel 7a', 'Pixel 6 Pro', 'Pixel 6', 'Pixel 5'] },
  { id: 'oppo', name: 'Oppo', logo: 'O', models: ['Find X6 Pro', 'Find X5 Pro', 'Reno 10 Pro', 'Reno 8', 'A78', 'A58'] },
  { id: 'huawei', name: 'Huawei', logo: 'H', models: ['P60 Pro', 'P50 Pro', 'Mate 50 Pro', 'Nova 11', 'Nova 10'] },
  { id: 'motorola', name: 'Motorola', logo: 'M', models: ['Edge 40 Pro', 'Edge 40', 'Razr 40 Ultra', 'Moto G84', 'Moto G54'] },
];

const ISSUES = [
  { id: 'screen', label: 'Screen Repair', emoji: '📱', basePrice: { apple: 149, samsung: 169, google: 129, oppo: 99, huawei: 119, motorola: 99 } },
  { id: 'battery', label: 'Battery', emoji: '🔋', basePrice: { apple: 79, samsung: 89, google: 69, oppo: 59, huawei: 69, motorola: 59 } },
  { id: 'backglass', label: 'Back Glass', emoji: '✨', basePrice: { apple: 89, samsung: 99, google: 79, oppo: 69, huawei: 79, motorola: 69 } },
  { id: 'port', label: 'Charging Port', emoji: '🔌', basePrice: { apple: 69, samsung: 79, google: 59, oppo: 49, huawei: 59, motorola: 49 } },
  { id: 'camera', label: 'Camera', emoji: '📸', basePrice: { apple: 99, samsung: 119, google: 89, oppo: 79, huawei: 89, motorola: 79 } },
  { id: 'water', label: 'Water Damage', emoji: '💧', basePrice: { apple: 129, samsung: 149, google: 119, oppo: 99, huawei: 109, motorola: 99 } },
  { id: 'speaker', label: 'Speaker', emoji: '🔊', basePrice: { apple: 69, samsung: 79, google: 59, oppo: 49, huawei: 59, motorola: 49 } },
  { id: 'diagnostic', label: 'Free Diagnostic', emoji: '🔍', basePrice: { apple: 0, samsung: 0, google: 0, oppo: 0, huawei: 0, motorola: 0 } },
  { id: 'other', label: 'Other', emoji: '🛠️', basePrice: { apple: 0, samsung: 0, google: 0, oppo: 0, huawei: 0, motorola: 0 } },
];

const REPAIR_CARDS = [
  { id: 'screen', title: 'Screen Repair', desc: 'Cracked or shattered? Back to mint in under an hour.', from: 'from $99', img: '/images/screen-repair.jpg', tag: 'Most Popular', size: 'hero' },
  { id: 'battery', title: 'Battery Replacement', desc: 'Fresh cells so you stop chasing power outlets.', from: 'from $59', img: '/images/battery-repair.jpg', size: 'tall' },
  { id: 'backglass', title: 'Back Glass', desc: 'Restore the finish — no shards, no sharp edges.', from: 'from $69', img: '/images/glass-repair.jpg', size: 'small' },
  { id: 'port', title: 'Charging Port', desc: 'Finicky cable? We clean or replace it, fast.', from: 'from $49', img: '/images/port-repair.jpg', size: 'small' },
  { id: 'other', title: 'Other Repairs', desc: 'Water damage, speakers, cameras — we\'ve seen it all.', from: 'custom quote', img: '/images/other-repairs.jpg', size: 'wide' },
  { id: 'diagnostic', title: 'Free Diagnostic', desc: 'Not sure what\'s wrong? Bring it in, no charge.', from: 'free', img: '/images/diagnostic.jpg', tag: 'Free', size: 'small' },
];

const SIM_PLANS = [
  { name: 'BASIC', price: 23, data: '12GB', features: ['Unlimited national calls & text', 'No excess data charges', 'Unlimited international SMS', 'Data Banking', 'Data Gifting'] },
  { name: '5G PLUS', price: 35, data: '40GB', featured: true, features: ['Unlimited national calls, SMS & MMS', '5G access (where available)', 'Data Banking', 'Data Gifting'] },
  { name: '5G GLOBAL', price: 30, data: '30GB', features: ['Standard national call & text', 'International calling included', 'Standard national MMS', 'Data Banking', 'Data Gifting'] },
  { name: '5G ADVANCED', price: 42, data: '75GB', features: ['Unlimited national calls, SMS & MMS', '5G access (where available)', 'International calling (20 countries)', 'Data Banking & Gifting'] },
  { name: '5G PREMIUM', price: 52, data: '120GB', features: ['Unlimited national calls, SMS & MMS', '5G access (where available)', 'International calling (20 countries)', 'Data Banking & Gifting'] },
  { name: '5G ULTIMATE', price: 59, data: '160GB', features: ['Standard national call & text', 'International calling (20 countries)', 'Standard MMS & Video MMS', 'Data Banking & Gifting'] },
];

const HANDSET_PLANS = [
  { name: 'BASIC', price: 49, data: '12GB', features: ['+ Up to 500GB Data Bank', '+ Up to 2000 MMS', 'Unlimited Talk & Text (AU)', 'Trusted mobile network', 'Data Gifting up to 50%'] },
  { name: 'GLOBAL', price: 57, data: '30GB', features: ['Download speeds capped at 150Mbps', '+ Up to 500GB Data Bank', 'Unlimited Talk & Text (AU)', 'International calls to 20 countries', '"Unlimited" international calls included', 'Data Banking up to 1000GB'] },
  { name: 'ADVANCE', price: 67, data: '75GB', featured: true, features: ['Download speeds capped at 250Mbps', '+ Up to 1000GB Data Bank', 'Unlimited Talk & Text (AU)', 'International calls to 20 countries', '"Unlimited" international calls included', 'Data Gifting up to 50%'] },
  { name: 'ULTIMATE', price: 84, data: '160GB', features: ['Download speeds capped at 250Mbps', '+ Up to 1000GB Data Bank', 'Unlimited Talk & Text (AU)', 'International calls to 20 countries', '"Unlimited" international calls included', 'Data Gifting up to 50%'] },
];

const ACCESSORIES = [
  { title: 'Protective Cases', desc: 'Drop-tested for every phone model.', price: 'from $19', img: '/images/case-1.jpg', tag: 'New' },
  { title: 'Screen Protectors', desc: 'Tempered glass, fitted in-store.', price: 'from $15', img: '/images/protector-1.jpg' },
  { title: 'Wireless Earbuds', desc: 'Big sound, smaller price.', price: 'from $39', img: '/images/earbuds-1.jpg' },
  { title: 'Fast Chargers', desc: 'USB-C PD up to 65W.', price: 'from $25', img: '/images/charger-1.jpg', tag: 'Sale' },
  { title: 'Charging Cables', desc: 'USB-C, Lightning, Micro USB.', price: 'from $9', img: '/images/cable-1.jpg' },
  { title: 'Power Banks', desc: '10,000mAh — a full day off-grid.', price: 'from $35', img: '/images/powerbank-1.jpg' },
];

const BRAND_TILES = [
  { id: 'apple', name: 'Apple', sub: 'All iPhone & iPad models' },
  { id: 'samsung', name: 'Samsung', sub: 'All Galaxy & Tablet models' },
  { id: 'google', name: 'Google', sub: 'All Pixel models' },
  { id: 'huawei', name: 'Huawei', sub: 'All models supported' },
  { id: 'motorola', name: 'Motorola', sub: 'All models supported' },
  { id: 'oppo', name: 'Oppo', sub: 'All models supported' },
  { id: 'other', name: 'Other', sub: 'Most brands welcome' },
];

const TESTIMONIALS = [
  { name: 'Livio Bruno', source: 'Google Review', avatar: 'https://i.pravatar.cc/150?img=33', text: 'Excellent — the best service. Got my iPhone screen fixed in under an hour. Quality is amazing and the price was very reasonable. Highly recommend!' },
  { name: 'Rikki Thomson', source: 'Google Review', avatar: 'https://i.pravatar.cc/150?img=44', text: 'Today I had the most wonderful customer service experience. The team went above and beyond on my Samsung repair. Explained everything clearly and the repair was perfect.' },
  { name: 'Teri Elley', source: 'Google Review', avatar: 'https://i.pravatar.cc/150?img=20', text: 'Outstanding service from the whole crew. Fixed my phone\'s charging port same day and gave me tips to prevent it again. Professional and friendly!' },
  { name: 'Sarah M.', source: 'Verified Customer', avatar: 'https://i.pravatar.cc/150?img=15', text: 'Best repair shop I\'ve been to. Cracked screen + battery issue sorted quickly. Staff are knowledgeable and prices are fair. My phone works like new again!' },
  { name: 'James K.', source: 'Verified Customer', avatar: 'https://i.pravatar.cc/150?img=8', text: 'So glad I found Express Repairs. Great service, competitive prices, quality repairs. My Pixel is working perfectly.' },
  { name: 'Michael R.', source: 'Verified Customer', avatar: 'https://i.pravatar.cc/150?img=12', text: 'Highly professional team. Diagnosed my phone for free and gave an honest quote. Done quickly and working perfectly. Great value for money!' },
];

const WARRANTIES = [
  { title: '6–12 Month Warranty', desc: 'All repairs covered by manufacturer-grade warranty.' },
  { title: 'Original-Quality Parts', desc: 'Genuine OEM or premium aftermarket, always.' },
  { title: 'Free Diagnostics', desc: 'No charge for phone assessment and quote.' },
  { title: 'Same-Day Service', desc: 'Most repairs completed in 30–90 minutes.' },
];

const FAQS = [
  { q: 'How long does a typical repair take?', a: 'Most repairs — screen replacements, battery swaps — are completed within 30–90 minutes. More complex repairs may take 2–3 hours. We\'ll give you a firm time estimate the moment you walk in.' },
  { q: 'Do you use genuine parts?', a: 'We use a combination of genuine OEM parts and premium aftermarket parts that meet or exceed original specifications. Every part is warrantied and thoroughly tested before installation.' },
  { q: 'What\'s covered under warranty?', a: 'Our warranty covers defects in parts and workmanship for 6–12 months depending on repair type. It doesn\'t cover physical damage, water damage, or issues caused by misuse after the repair.' },
  { q: 'Do I need an appointment?', a: 'Walk-ins are always welcome. Booking ahead just guarantees we\'ll have your parts in stock and gets you served faster. Call us or use the quote form below.' },
  { q: 'Will my data be safe during repair?', a: 'Yes — we don\'t need to access your data for most repairs. We still recommend backing up your device before any service as a precaution.' },
  { q: 'What payment methods do you accept?', a: 'Cash, all major credit cards (Visa, Mastercard, Amex), debit cards, and digital payments including Apple Pay and Google Pay.' },
];

const HOURS = [
  { day: 'Monday', hrs: '9:00 AM – 6:00 PM', dow: 1 },
  { day: 'Tuesday', hrs: '9:00 AM – 6:00 PM', dow: 2 },
  { day: 'Wednesday', hrs: '9:00 AM – 6:00 PM', dow: 3 },
  { day: 'Thursday', hrs: '9:00 AM – 7:00 PM', dow: 4 },
  { day: 'Friday', hrs: '9:00 AM – 6:00 PM', dow: 5 },
  { day: 'Saturday', hrs: '9:00 AM – 5:00 PM', dow: 6 },
  { day: 'Sunday', hrs: '10:00 AM – 2:00 PM', dow: 0 },
];

const SITE = {
  name: 'Express Repairs',
  phone: '1300 373 773',
  phoneHref: 'tel:+611300373773',
  addressLines: ['Shop 12, 100 Main Street', 'Sydney NSW 2000'],
  addressShort: '100 Main Street, Sydney NSW 2000',
  mapsQuery: '100 Main Street Sydney',
  tagline: 'Same-day phone repairs done right',
};

Object.assign(window, { BRANDS, ISSUES, REPAIR_CARDS, SIM_PLANS, HANDSET_PLANS, ACCESSORIES, BRAND_TILES, TESTIMONIALS, WARRANTIES, FAQS, HOURS, SITE });
