import { Link } from 'react-router-dom';
import type { Category, Recipe } from '../api/types';
import { categoryInfo } from './categories';
import { fallbackImage, recipeImage } from './images';
import { StarRating } from './StarRating';

interface Props {
  recipe: Recipe;
  index: number;
  saved?: boolean;
  onToggleSave?: (recipe: Recipe) => void;
  onTagClick?: (tag: string) => void;
  onCategoryClick?: (category: Category) => void;
  showCategory?: boolean;
}

export function RecipeCard({ recipe, index, saved, onToggleSave, onTagClick, onCategoryClick, showCategory = true }: Props) {
  const cat = categoryInfo(recipe.category);
  return (
    <article className="recipe-card">
      <Link to={`/recipes/${recipe.id}`} className="recipe-card__media">
        <img
          src={recipeImage(recipe)}
          alt=""
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            const fb = fallbackImage(recipe.id);
            if (!img.src.endsWith(fb)) img.src = fb;
          }}
        />
        <span className="badge-num">{String(index + 1).padStart(2, '0')}</span>
      </Link>

      {showCategory && cat && (
        <button type="button" className="card-category" onClick={() => onCategoryClick?.(cat.value)} aria-label={`Show all ${cat.plural.toLowerCase()} recipes`}>
          {cat.label}
        </button>
      )}

      {onToggleSave && (
        <button
          type="button"
          className={`save-btn ${saved ? 'is-saved' : ''}`}
          aria-pressed={!!saved}
          aria-label={saved ? 'Remove from saved' : 'Save recipe'}
          onClick={() => onToggleSave(recipe)}
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M6 3h12v18l-6-4-6 4z" />
          </svg>
        </button>
      )}

      <div className="recipe-card__body">
        <h3 className="recipe-card__title">
          <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>
        </h3>
        {recipe.description && <p className="recipe-card__desc">{recipe.description}</p>}

        {recipe.tags.length > 0 && (
          <ul className="tag-list">
            {recipe.tags.slice(0, 4).map((t) => (
              <li key={t}>
                <button type="button" className="tag-link" onClick={() => onTagClick?.(t)}>
                  #{t}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="recipe-card__meta">
          <StarRating value={recipe.rating_avg} size="sm" count={recipe.rating_count} />
          <span className="price-like">
            {recipe.prep_minutes > 0 ? `${recipe.prep_minutes} min` : 'Quick'} · {recipe.servings} serv
          </span>
        </div>
      </div>
    </article>
  );
}
