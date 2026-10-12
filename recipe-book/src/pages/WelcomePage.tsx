import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONTENTS } from '../components/categories';
import { photos } from '../components/images';
import cover1 from '../assets/covers/cover-1.jpg';
import cover2 from '../assets/covers/cover-2.jpg';
import cover3 from '../assets/covers/cover-3.jpg';
import cover4 from '../assets/covers/cover-4.jpg';

interface Feature {
  script: string;
  title: string;
  tagline: string;
  body: string;
  link: { to: string; label: string };
  shots: { photo: string; caption: string }[];
}

const FEATURES: Feature[] = [
  {
    script: 'Discover',
    title: 'Find recipes',
    tagline: 'Inspiration at your fingertips.',
    body: 'Browse the book by chapter, from breakfast to dessert, search by title, narrow it down by tag, and switch between everyone’s recipes and your own.',
    link: { to: '/contents', label: 'Browse the chapters' },
    shots: [
      { photo: photos.lunch, caption: 'lunch, sorted' },
      { photo: photos.breakfast, caption: 'first thing' },
    ],
  },
  {
    script: 'Plan',
    title: 'Create meal plans',
    tagline: 'Master your prep.',
    body: 'Put dishes together for a sitting, set the portions per person and see the nutrition per person. One shopping list adds up every ingredient, scaled to however many people are eating.',
    link: { to: '/meal-plans', label: 'See the meal plans' },
    shots: [
      { photo: photos.dinner, caption: 'sunday dinner' },
      { photo: photos.drink, caption: 'and to drink' },
      { photo: photos.lunch, caption: 'for six' },
    ],
  },
  {
    script: 'Create',
    title: 'Add recipes',
    tagline: 'Build your digital legacy.',
    body: 'Keep family recipes for good, with their ingredients, steps, nutrition, meal times, tags and a photo, organised in one place and editable any time.',
    link: { to: '/recipes/new', label: 'Write a recipe' },
    shots: [
      { photo: photos.snacks, caption: 'grandma’s' },
      { photo: photos.breakfast, caption: 'our secret' },
    ],
  },
  {
    script: 'Scale',
    title: 'Cook for any crowd',
    tagline: 'Cooking for more?',
    body: 'Change the servings on any recipe and every ingredient is rescaled for you, so the quantities on the page always match the table.',
    link: { to: '/recipes', label: 'Pick a recipe' },
    shots: [
      { photo: photos.dinner, caption: 'serves 2… or 12' },
      { photo: photos.snacks, caption: 'seconds?' },
    ],
  },
  {
    script: 'Savour',
    title: 'Save, rate & review',
    tagline: 'Remember what worked.',
    body: 'Bookmark your favourites, rate them out of five stars, and read what other cooks thought before you start.',
    link: { to: '/recipes?scope=saved', label: 'Your saved recipes' },
    shots: [
      { photo: photos.drink, caption: 'five stars' },
      { photo: photos.lunch, caption: 'a keeper' },
    ],
  },
  {
    script: 'Share',
    title: 'Share your plans',
    tagline: 'From your table to everyone’s.',
    body: 'Publish a meal plan to the public catalog, and browse the featured plans other cooks have shared.',
    link: { to: '/meal-plans', label: 'Open the catalog' },
    shots: [
      { photo: photos.breakfast, caption: 'brunch club' },
      { photo: photos.dinner, caption: 'yours faithfully' },
      { photo: photos.drink, caption: 'cheers' },
    ],
  },
];

const COVERS = [cover1, cover2, cover3, cover4];
const LAST_COVER_KEY = 'rb.lastCover';

/** A random front cover, never the one shown on the previous visit. */
function pickCover(): string {
  let last = -1;
  try {
    last = Number(localStorage.getItem(LAST_COVER_KEY) ?? -1);
  } catch {
    // storage unavailable: any cover will do
  }
  const choices = COVERS.map((_, i) => i).filter((i) => i !== last);
  const next = choices[Math.floor(Math.random() * choices.length)];
  try {
    localStorage.setItem(LAST_COVER_KEY, String(next));
  } catch {
    // ignore
  }
  return COVERS[next];
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const COLLAGE = ['Breakfast', 'Lunch', 'Drinks'].flatMap((label) => CONTENTS.filter((c) => c.label === label));

export function WelcomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [cover] = useState(pickCover);

  // As the hero scrolls past, the book's cover swings open (--open), then the spread fills the frame (--grow).
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = hero.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel > 0 ? clamp01(-rect.top / travel) : 1;
      hero.style.setProperty('--open', clamp01(p / 0.55).toFixed(3));
      hero.style.setProperty('--grow', clamp01((p - 0.6) / 0.4).toFixed(3));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Sections fade in as they enter the viewport.
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('.reveal');
    if (!els) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const ticker = CONTENTS.map((c) => c.label);

  return (
    <div className="welcome" ref={rootRef}>
      <section className="welcome-hero" ref={heroRef}>
        <div className="welcome-hero__frame">
          <div className="welcome-book">
            <div className="welcome-book__page welcome-book__page--right">
              <p className="welcome-eyebrow">Welcome to</p>
              <h1 className="welcome-book__title">Recipe Book</h1>
              <p className="welcome-hero__lede">
                Every recipe, meal plan and review your kitchen has, in one shared book.
              </p>
              <div className="welcome-hero__actions">
                <Link to="/contents" className="btn btn--primary">Open the book</Link>
                <Link to="/meal-plans" className="btn btn--ghost">Meal plans</Link>
              </div>
            </div>
            <div className="welcome-book__cover" aria-hidden>
              <div className="welcome-book__front">
                <img src={cover} alt="" />
              </div>
              <div className="welcome-book__back">
                <img src={photos.lunch} alt="" />
                <p className="welcome-script">Cook. Taste.<br />Share. Repeat.</p>
              </div>
            </div>
            <span className="welcome-book__spine" />
          </div>
          <span className="welcome-hero__scroll" aria-hidden>
            Scroll to discover
          </span>
        </div>
      </section>

      <section className="welcome-intro container">
        <div className="welcome-intro__copy reveal">
          <p className="welcome-eyebrow">Your kitchen’s own book</p>
          <p>
            No more recipes lost in notebooks, screenshots and the backs of envelopes. Recipe Book keeps the dishes
            you love, the plans you cook from and the notes you leave each other together, so dinner is one tap
            away.
          </p>
          <Link to="/menu" className="welcome-link">See what’s on the menu</Link>
        </div>
        <figure className="polaroid polaroid--tilt-r welcome-intro__polaroid reveal">
          <img src={photos.dinner} alt="" />
          <figcaption className="polaroid__caption">Dinner tonight?</figcaption>
        </figure>
      </section>

      <section className="welcome-collage container" aria-label="Chapters">
        {COLLAGE.map((c, i) => (
          <Link key={c.label} to={c.to} className={`welcome-collage__tile welcome-collage__tile--${i + 1} reveal`}>
            <img src={c.photos[0]} alt="" />
            <span className="welcome-collage__label">{c.label}</span>
          </Link>
        ))}
      </section>

      <section className="welcome-ticker" aria-label="Something for every meal">
        <p className="welcome-script welcome-ticker__script">Something for</p>
        <div className="welcome-ticker__track" aria-hidden>
          {[0, 1].map((copy) => (
            <span key={copy} className="welcome-ticker__run">
              {ticker.map((word) => (
                <span key={word} className="welcome-ticker__word">
                  <span className="welcome-ticker__star">✦</span>
                  {word}
                </span>
              ))}
            </span>
          ))}
        </div>
        <p className="sr-only">{ticker.join(', ')}</p>
      </section>

      <section className="welcome-features container" aria-label="Features">
        {FEATURES.map((f, i) => (
          <article key={f.title} className={`feature${i % 2 ? ' feature--flip' : ''}`}>
            <div className="feature__photos reveal" aria-hidden>
              {f.shots.map((s, j) => (
                <figure key={j} className={`polaroid feature__shot feature__shot--${j + 1}`}>
                  <img src={s.photo} alt="" />
                  <figcaption className="polaroid__caption">{s.caption}</figcaption>
                </figure>
              ))}
            </div>
            <div className="feature__copy reveal">
              <p className="welcome-script feature__script">{f.script}</p>
              <h2 className="feature__title">{f.title}</h2>
              <p className="feature__tagline">{f.tagline}</p>
              <p className="feature__body">{f.body}</p>
              <Link to={f.link.to} className="welcome-link">{f.link.label}</Link>
            </div>
          </article>
        ))}
      </section>

      <section className="welcome-outro">
        <img src={photos.snacks} alt="" />
        <div className="welcome-outro__text reveal">
          <p className="welcome-script">Your turn</p>
          <h2 className="welcome-outro__title">What are we cooking?</h2>
          <div className="welcome-hero__actions">
            <Link to="/recipes/new" className="btn btn--primary">New recipe</Link>
            <Link to="/contents" className="btn btn--ghost">Open the book</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
