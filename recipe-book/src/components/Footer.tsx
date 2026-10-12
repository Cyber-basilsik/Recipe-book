interface Credit {
  name: string;
  href: string;
  licence: string;
}

/** Third-party code and fonts the app ships with or is built by, with their licences. */
const CREDITS: { group: string; items: Credit[] }[] = [
  {
    group: 'Libraries',
    items: [
      { name: 'React', href: 'https://react.dev', licence: 'MIT' },
      { name: 'React DOM', href: 'https://react.dev', licence: 'MIT' },
      { name: 'React Router', href: 'https://reactrouter.com', licence: 'MIT' },
    ],
  },
  {
    group: 'Fonts',
    items: [
      { name: 'Playfair Display', href: 'https://fonts.google.com/specimen/Playfair+Display', licence: 'OFL 1.1' },
      { name: 'Source Sans 3', href: 'https://fonts.google.com/specimen/Source+Sans+3', licence: 'OFL 1.1' },
      { name: 'Parisienne', href: 'https://fonts.google.com/specimen/Parisienne', licence: 'OFL 1.1' },
    ],
  },
  {
    group: 'Built with',
    items: [
      { name: 'Vite', href: 'https://vite.dev', licence: 'MIT' },
      { name: 'TypeScript', href: 'https://www.typescriptlang.org', licence: 'Apache 2.0' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__brand">
          <span className="logo__text">Recipe<span>Book</span></span>
          <span className="muted small">Cook. Taste. Share. Repeat.</span>
        </div>
        <dl className="site-footer__credits">
          {CREDITS.map(({ group, items }) => (
            <div key={group} className="site-footer__group">
              <dt>{group}</dt>
              {items.map((c) => (
                <dd key={c.name}>
                  <a href={c.href} target="_blank" rel="noreferrer">{c.name}</a>{' '}
                  <span className="site-footer__licence">{c.licence}</span>
                </dd>
              ))}
            </div>
          ))}
        </dl>
      </div>
    </footer>
  );
}
