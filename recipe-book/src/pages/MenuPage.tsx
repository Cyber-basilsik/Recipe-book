import { Link } from 'react-router-dom';
import { photos } from '../components/images';

const ITEMS = [
  { label: 'Recipes', blurb: 'Browse the book by chapter', to: '/contents', photo: photos.dinner },
  { label: 'Meal plans', blurb: 'Dishes put together for a sitting', to: '/meal-plans', photo: photos.lunch },
];

export function MenuPage() {
  return (
    <section className="menu-page container">
      <div className="toc__head">
        <h1 className="toc__title">
          The
          <br />
          menu
        </h1>
      </div>

      <ul className="menu-page__grid">
        {ITEMS.map((item) => (
          <li key={item.to} className="menu-card">
            <Link to={item.to}>
              <img className="menu-card__img" src={item.photo} alt="" />
              <span className="menu-card__text">
                <span className="menu-card__label">{item.label}</span>
                <span className="menu-card__blurb">{item.blurb}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
