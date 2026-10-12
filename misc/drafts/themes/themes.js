/* Theme drafts: the list of themes, and a loader that layers one over the app's real stylesheet.
   Include it in <head> after theme.css. With ?theme=<id> in the URL it adds base.css, <id>.css
   and the theme's Google Fonts; without it the page keeps the current amber theme. */
(function () {
  var THEMES = [
    {
      id: 'charcoal-brass',
      name: 'Charcoal & Brass',
      mode: 'dark',
      fonts: 'Cormorant Garamond / Inter',
      intent: 'The current dark room, with the amber dulled to aged brass and an old-style serif. The closest step from today.',
      swatches: ['#141517', '#1e1f22', '#ece7de', '#a9a49b', '#c2a572'],
      href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600&display=swap',
    },
    {
      id: 'midnight-copper',
      name: 'Midnight & Copper',
      mode: 'dark',
      fonts: 'Playfair Display / Source Sans 3',
      intent: 'Deep navy and copper, like a hotel dining room. Cool and formal, with a warm metallic accent.',
      swatches: ['#0f141c', '#18202c', '#e8edf3', '#9aa6b5', '#d08c5c'],
      href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Source+Sans+3:wght@400;500;600&display=swap',
    },
    {
      id: 'forest-sage',
      name: 'Forest & Sage',
      mode: 'dark',
      fonts: 'Fraunces / Figtree',
      intent: 'Dark green and sage, like a farm-to-table bistro. Fresh and natural without being bright.',
      swatches: ['#121915', '#1a241e', '#ebe7dc', '#a3ab9f', '#a8bd8f'],
      href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Figtree:wght@400;500;600&display=swap',
    },
    {
      id: 'linen-terracotta',
      name: 'Linen & Terracotta',
      mode: 'light',
      fonts: 'DM Serif Display / DM Sans',
      intent: 'Warm linen paper with terracotta, like a printed cookbook. Light, friendly and editorial.',
      swatches: ['#f6f1e9', '#fffdf9', '#2b2420', '#6b6158', '#a8492a'],
      href: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap',
    },
    {
      id: 'porcelain-ink',
      name: 'Porcelain & Ink',
      mode: 'light',
      fonts: 'Newsreader / Manrope',
      intent: 'Crisp white, near-black type and a deep teal accent, like a food magazine. The most restrained of the five.',
      swatches: ['#f6f6f3', '#ffffff', '#1b1e23', '#5c6168', '#2c6a60'],
      href: 'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Manrope:wght@400;500;600;700&display=swap',
    },
  ];
  window.RB_THEMES = THEMES;

  var base = document.currentScript.src.replace(/[^/]*$/, '');
  var id = new URLSearchParams(location.search).get('theme');
  var theme = THEMES.filter(function (t) { return t.id === id; })[0];
  if (!theme) return;

  [theme.href, base + 'base.css', base + theme.id + '.css'].forEach(function (href) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  });
  document.documentElement.dataset.theme = theme.id;
})();
