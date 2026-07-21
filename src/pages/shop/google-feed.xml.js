import { PRODUCTS } from '../../data/products.js';

// Google Merchant Center product feed (RSS 2.0). Meta Commerce Manager reads
// the same URL. Free-over-$99 shipping is a Merchant Center account rule, not
// per-item — only the flat rate is emitted here.
const xmlEsc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const item = (p) => {
  const price = (p.priceCents / 100).toFixed(2);
  return [
    '<item>',
    `<g:id>${xmlEsc(p.id)}</g:id>`,
    `<title>${xmlEsc(p.name)}</title>`,
    // Merchant Center *requires* a description; DXPOS supplies none, so build one
    // from name + category. Never `brand` — it's the supplier's category.name and
    // may be internal jargon (see productSchema).
    `<description>${xmlEsc(p.name)} — ${xmlEsc(p.category)} from Express Repairs, Riverwood. Ships Australia-wide, or free pickup in store.</description>`,
    `<link>https://www.expressrepairs.com.au/shop/${xmlEsc(p.id)}/</link>`,
    `<g:image_link>${xmlEsc(p.image)}</g:image_link>`,
    `<g:price>${price} AUD</g:price>`,
    '<g:availability>in_stock</g:availability>',
    '<g:condition>new</g:condition>',
    p.brand ? `<g:brand>${xmlEsc(p.brand)}</g:brand>` : '',
    p.sku ? `<g:mpn>${xmlEsc(p.sku)}</g:mpn>` : '',
    !p.brand && !p.sku ? '<g:identifier_exists>no</g:identifier_exists>' : '',
    '<g:shipping><g:country>AU</g:country><g:service>Standard</g:service><g:price>10.95 AUD</g:price></g:shipping>',
    '</item>',
  ].filter(Boolean).join('');
};

export function GET() {
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">' +
    '<channel>' +
    '<title>Express Repairs Accessories</title>' +
    '<link>https://www.expressrepairs.com.au/shop/</link>' +
    '<description>Phone accessories — ship Australia-wide or free pickup at Riverwood Plaza.</description>' +
    PRODUCTS.map(item).join('') +
    '</channel></rss>';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
