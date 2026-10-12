import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { CONTENTS } from '../components/categories';

export function ContentsPage() {
  const track = useRef<HTMLOListElement>(null);

  // Scroll by one panel, whatever width the breakpoints give it.
  const step = (dir: 1 | -1) => {
    const el = track.current;
    const card = el?.querySelector<HTMLElement>('.panel-card');
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: 'smooth' });
  };

  return (
    <section className="toc container">
      <div className="toc__head">
        <h1 className="toc__title">
          Table of
          <br />
          contents
        </h1>
        <Link to="/recipes/new" className="btn btn--primary">
          New recipe
        </Link>
      </div>

      <div className="toc__viewport">
        <button type="button" className="toc__arrow toc__arrow--prev" aria-label="Previous chapters" onClick={() => step(-1)}>
          ‹
        </button>
        <ol className="toc__track" ref={track}>
          {CONTENTS.map((c, i) => (
            <li key={c.label} className={`panel-card ${c.zoom ? 'panel-card--zoom' : ''}`}>
              <Link to={c.to}>
                {c.photos.length > 1 ? (
                  <span className="panel-card__collage">
                    {c.photos.map((p) => (
                      <img key={p} src={p} alt="" />
                    ))}
                  </span>
                ) : (
                  <img className="panel-card__img" src={c.photos[0]} alt="" />
                )}
                <span className="panel-card__num">{String(i + 1).padStart(2, '0')}</span>
                <span className="panel-card__name">{c.label}</span>
              </Link>
            </li>
          ))}
        </ol>
        <button type="button" className="toc__arrow toc__arrow--next" aria-label="More chapters" onClick={() => step(1)}>
          ›
        </button>
      </div>
    </section>
  );
}
