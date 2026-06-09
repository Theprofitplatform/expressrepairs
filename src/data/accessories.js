import { z } from 'zod';
import { accessorySchema, brandTileSchema } from './schema.js';

export const ACCESSORIES = z.array(accessorySchema).parse([
  { title: 'Protective Cases', desc: 'Drop-tested for every phone model.', price: 'from $19', img: '/images/case-1.jpg', tag: 'New' },
  { title: 'Screen Protectors', desc: 'Tempered glass, fitted in-store.', price: 'from $15', img: '/images/protector-1.jpg' },
  { title: 'Wireless Earbuds', desc: 'Big sound, smaller price.', price: 'from $39', img: '/images/earbuds-1.jpg' },
  { title: 'Fast Chargers', desc: 'USB-C PD up to 65W.', price: 'from $25', img: '/images/charger-1.jpg', tag: 'Sale' },
  { title: 'Charging Cables', desc: 'USB-C, Lightning, Micro USB.', price: 'from $9', img: '/images/cable-1.jpg' },
  { title: 'Power Banks', desc: '10,000mAh — a full day off-grid.', price: 'from $35', img: '/images/powerbank-1.jpg' },
]);

export const BRAND_TILES = z.array(brandTileSchema).parse([
  { id: 'apple', name: 'Apple', sub: 'All iPhone & iPad models' },
  { id: 'samsung', name: 'Samsung', sub: 'All Galaxy & Tablet models' },
  { id: 'google', name: 'Google', sub: 'All Pixel models' },
  { id: 'huawei', name: 'Huawei', sub: 'All models supported' },
  { id: 'motorola', name: 'Motorola', sub: 'All models supported' },
  { id: 'oppo', name: 'Oppo', sub: 'All models supported' },
  { id: 'other', name: 'Other', sub: 'Most brands welcome' },
]);
