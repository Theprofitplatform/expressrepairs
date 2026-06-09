import { z } from 'zod';
import { brandSchema } from './schema.js';

export const BRANDS = z.array(brandSchema).parse([
  { id: 'apple', name: 'Apple', logo: '', models: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 12', 'iPhone 11', 'iPhone XR', 'iPhone SE'] },
  { id: 'samsung', name: 'Samsung', logo: 'S', models: ['Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy S23 Ultra', 'Galaxy S23', 'Galaxy S22', 'Galaxy Z Fold5', 'Galaxy Z Flip5', 'Galaxy A54', 'Galaxy A34', 'Galaxy Note 20'] },
  { id: 'google', name: 'Google', logo: 'G', models: ['Pixel 8 Pro', 'Pixel 8', 'Pixel 7 Pro', 'Pixel 7', 'Pixel 7a', 'Pixel 6 Pro', 'Pixel 6', 'Pixel 5'] },
  { id: 'oppo', name: 'Oppo', logo: 'O', models: ['Find X6 Pro', 'Find X5 Pro', 'Reno 10 Pro', 'Reno 8', 'A78', 'A58'] },
  { id: 'huawei', name: 'Huawei', logo: 'H', models: ['P60 Pro', 'P50 Pro', 'Mate 50 Pro', 'Nova 11', 'Nova 10'] },
  { id: 'motorola', name: 'Motorola', logo: 'M', models: ['Edge 40 Pro', 'Edge 40', 'Razr 40 Ultra', 'Moto G84', 'Moto G54'] },
]);
