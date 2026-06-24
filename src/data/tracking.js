// Conversion-tracking tag IDs for the ad landing pages. Each is OPTIONAL:
// AdTracking.astro emits a tag only when its ID is non-empty, so the pages
// work with nothing configured and you fill these in when ads go live.
//
//   ga4Id              GA4 measurement ID,         e.g. 'G-XXXXXXXXXX'
//   googleAdsId        Google Ads conversion ID,   e.g. 'AW-XXXXXXXXXX'
//   googleAdsCallLabel conversion label for a call (the part after the '/')
//   googleAdsLeadLabel conversion label for a form lead
//   metaPixelId        Meta (Facebook) Pixel ID,   e.g. '1234567890'
export const TRACKING = {
  ga4Id: 'G-RMD7TWKMXE',
  googleAdsId: '',
  googleAdsCallLabel: '',
  googleAdsLeadLabel: '',
  metaPixelId: '28525940300327696',
};
