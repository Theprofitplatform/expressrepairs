// Shared between /shop/ (category landing) and /shop/c/[category]/[...page]
// (paginated product grid) so both sides slugify the same way.
export const slugifyCategory = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
