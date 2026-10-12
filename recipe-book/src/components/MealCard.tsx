import { Link } from 'react-router-dom';
import type { Meal, MealType, MealVisibility } from '../api/types';
import { mealTypeInfo } from './categories';
import { fallbackImage, mealImage } from './images';

const VISIBILITY_LABEL: Record<MealVisibility, string> = { PRIVATE: 'Private', PENDING: 'In review', PUBLIC: 'Public' };

export function visibilityLabel(v: MealVisibility): string {
  return VISIBILITY_LABEL[v] ?? v;
}

/** The meal plan's visibility, plus a "Featured" badge when an admin has featured it. */
export function MealBadges({ meal, showVisibility = true }: { meal: Meal; showVisibility?: boolean }) {
  return (
    <span className="status-badges">
      {meal.is_featured && <span className="status-badge status-badge--featured">★ Featured</span>}
      {showVisibility && (
        <span className={`status-badge status-badge--${meal.visibility.toLowerCase()}`}>{visibilityLabel(meal.visibility)}</span>
      )}
    </span>
  );
}

interface Props {
  meal: Meal;
  index: number;
  showVisibility?: boolean;
  onTagClick?: (tag: string) => void;
  onCategoryClick?: (mealType: MealType) => void;
}

export function MealCard({ meal, index, showVisibility = false, onTagClick, onCategoryClick }: Props) {
  const cat = mealTypeInfo(meal.meal_type);
  const dishes = meal.items.length;
  return (
    <article className="recipe-card">
      <Link to={`/meal-plans/${meal.id}`} className="recipe-card__media">
        <img
          src={mealImage(meal)}
          alt=""
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            const fb = fallbackImage(meal.id);
            if (!img.src.endsWith(fb)) img.src = fb;
          }}
        />
        <span className="badge-num">{String(index + 1).padStart(2, '0')}</span>
      </Link>

      {cat && (
        <button type="button" className="card-category" onClick={() => onCategoryClick?.(cat.value)} aria-label={`Show all ${cat.label.toLowerCase()} meal plans`}>
          {cat.label}
        </button>
      )}

      <div className="recipe-card__body">
        <h3 className="recipe-card__title">
          <Link to={`/meal-plans/${meal.id}`}>{meal.title}</Link>
        </h3>
        {meal.description && <p className="recipe-card__desc">{meal.description}</p>}

        {meal.tags.length > 0 && (
          <ul className="tag-list">
            {meal.tags.slice(0, 4).map((t) => (
              <li key={t}>
                <button type="button" className="tag-link" onClick={() => onTagClick?.(t)}>
                  #{t}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="recipe-card__meta">
          <MealBadges meal={meal} showVisibility={showVisibility} />
          <span className="price-like">
            {dishes} dish{dishes === 1 ? '' : 'es'}
            {meal.calories ? ` · ${meal.calories} kcal` : ''}
          </span>
        </div>
      </div>
    </article>
  );
}
