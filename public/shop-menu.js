// Cascade behaviour for the shop mega menu (src/components/ShopMegaMenu.astro).
// Everything the two flyout columns render comes from /shop/menu.json
// (src/pages/shop/menu.json.js), fetched once on first hover and kept in
// memory for the session.
//
// It lives in public/ rather than in the component because Astro inlines a
// hoisted script under 4KB, and this one is 2.6KB minified — inlined it would
// ship ~27MB of uncacheable duplicate JS across the 10,347 pages that carry
// the nav. As a public file it is one request, cached for the whole session.
// The cost is no bundling: plain ES2020, no imports.
//
// A page can carry more than one panel — /shop/ renders a second copy in its
// "Browse categories" dropdown — so every [data-cascade] gets its own state.
// The wrapper is what opens the panel and what the fetch hangs off: .mega in
// the nav, .shop-browse for the in-page <details>.
for (const nav of document.querySelectorAll('[data-cascade]')) {
  const mega = nav.closest('.mega, .shop-browse');
  if (!mega) continue;
  const col = (name) => nav.querySelector(`[data-col="${name}"]`);
  const head = (name) => nav.querySelector(`[data-head="${name}"]`);
  const cats = col('cats');
  const fams = col('families');
  const models = col('models');
  const fmt = (n) => n.toLocaleString('en-AU');

  let tree = null;
  let pending = null;
  let openCat = null;
  let openFam = null;

  // The drawer stacks the columns, so a tap on a category has to open it
  // rather than follow its link. Matches the CSS breakpoint in global.css.
  const isDrawer = () => window.matchMedia('(max-width: 1080px)').matches;

  const load = () => {
    if (tree) return Promise.resolve(tree);
    // Failure leaves the flyouts empty on purpose: every category link in
    // column one still works, and the category page carries these same model
    // links in its own filter drawer.
    pending ||= fetch('/shop/menu.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((t) => (tree = t))
      .catch(() => null);
    return pending;
  };

  // Built as nodes, not innerHTML — the labels are supplier-derived product
  // text, so they never get parsed as markup.
  const row = (label, count, { href, fam }) => {
    const li = document.createElement('li');
    const el = document.createElement(href ? 'a' : 'button');
    el.className = 'cascade-row';
    if (href) el.href = href;
    else el.type = 'button';
    if (fam) {
      el.dataset.fam = fam;
      el.setAttribute('aria-expanded', 'false');
    }
    const name = document.createElement('span');
    name.textContent = label;
    const n = document.createElement('span');
    n.className = 'mega-count';
    n.textContent = fmt(count);
    el.append(name, n);
    li.append(el);
    return li;
  };

  const fill = (list, rows) => list.replaceChildren(...rows);

  // aria-expanded belongs on the row that controls a column, and is only true
  // while that column is showing its contents.
  const mark = (list, attr, value) => {
    for (const el of list.querySelectorAll('[aria-expanded]')) el.setAttribute('aria-expanded', 'false');
    list.querySelector(`[data-${attr}="${CSS.escape(value)}"]`)?.setAttribute('aria-expanded', 'true');
  };

  const showModels = (cat, family) => {
    if (openCat === cat.s && openFam === family.n) return;
    openFam = family.n;
    mark(fams, 'fam', family.n);
    head('models').textContent = `${family.n} models`;
    fill(models, family.m.map((m) => row(m.n, m.c, { href: `/shop/c/${cat.s}/m/${m.k}/` })));
  };

  const showFamilies = (slug) => {
    const cat = tree?.find((c) => c.s === slug);
    if (!cat || openCat === slug) return;
    openCat = slug;
    openFam = null;
    mark(cats, 'cat', slug);
    head('families').textContent = cat.n;

    // Cables, Audio, Watch Cases and AirPods Cases carry no extractable device
    // model — they are leaves, and the category link is the answer.
    if (!cat.f.length) {
      fill(fams, [row(`All ${cat.n}`, cat.c, { href: `/shop/c/${cat.s}/` })]);
      fill(models, []);
      head('models').textContent = 'Model';
      return;
    }

    fill(fams, cat.f.map((f) => row(f.n, f.m.reduce((sum, m) => sum + m.c, 0), { fam: f.n })));
    showModels(cat, cat.f[0]);
  };

  const familyRow = (name) => {
    const cat = tree?.find((c) => c.s === openCat);
    const family = cat?.f.find((f) => f.n === name);
    if (family) showModels(cat, family);
  };

  const open = () =>
    load().then(() => tree && !openCat && showFamilies(cats.querySelector('[data-cat]')?.dataset.cat));

  mega.addEventListener('pointerenter', open);
  mega.addEventListener('focusin', open);

  const hover = (e) => {
    if (!tree || isDrawer()) return;
    const cat = e.target.closest('[data-cat]');
    if (cat) return showFamilies(cat.dataset.cat);
    const fam = e.target.closest('[data-fam]');
    if (fam) familyRow(fam.dataset.fam);
  };
  nav.addEventListener('pointerover', hover);
  nav.addEventListener('focusin', hover);

  nav.addEventListener('click', (e) => {
    const fam = e.target.closest('[data-fam]');
    if (fam) return familyRow(fam.dataset.fam);
    // Drawer only: the first tap opens the category, a second follows its link.
    const cat = e.target.closest('[data-cat]');
    if (!cat || !isDrawer() || cat.getAttribute('aria-expanded') === 'true') return;
    e.preventDefault();
    load().then(() => showFamilies(cat.dataset.cat));
  });
}
