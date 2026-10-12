import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { recipesApi } from '../api/recipes';
import type { Interaction, Recipe } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { categoryInfo, mealTypeInfo } from '../components/categories';
import { EmptyState, ErrorBanner, Spinner, errorMessage } from '../components/Feedback';
import { fallbackImage, recipeImage } from '../components/images';
import { StarRating } from '../components/StarRating';

const REVIEWS_PAGE = 10;

function formatQty(n: number) {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 100) / 100);
}

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function RecipePage() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [baseServings, setBaseServings] = useState<number | null>(null);
  const [servings, setServings] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [mine, setMine] = useState<Interaction | null>(null);
  const [reviewDraft, setReviewDraft] = useState('');
  const [interactionBusy, setInteractionBusy] = useState(false);
  const [interactionMsg, setInteractionMsg] = useState<string | null>(null);

  const [reviews, setReviews] = useState<Interaction[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);
    recipesApi
      .get(id)
      .then((r) => {
        if (cancelled) return;
        setRecipe(r);
        setBaseServings(r.servings);
        setServings(r.servings);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(errorMessage(err));
      })
      .finally(() => !cancelled && setLoading(false));
    recipesApi
      .getInteraction(id)
      .then((i) => {
        if (cancelled) return;
        setMine(i);
        setReviewDraft(i.review_text ?? '');
      })
      .catch(() => !cancelled && setMine(null));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadReviews = useCallback(
    (offset = 0) => {
      recipesApi
        .reviews(id, REVIEWS_PAGE, offset)
        .then((res) => {
          setReviews((prev) => (offset === 0 ? res.items : [...prev, ...res.items]));
          setReviewTotal(res.total);
        })
        .catch(() => undefined);
    },
    [id],
  );
  useEffect(() => loadReviews(0), [loadReviews]);

  // Re-scale ingredient quantities when servings change.
  useEffect(() => {
    if (!recipe || servings === null || baseServings === null) return;
    if (servings === recipe.servings) return;
    const handle = setTimeout(() => {
      recipesApi
        .get(id, servings)
        .then(setRecipe)
        .catch((err) => setError(errorMessage(err)));
    }, 250);
    return () => clearTimeout(handle);
  }, [servings, id, recipe, baseServings]);

  const refreshRecipeStats = () =>
    recipesApi
      .get(id, servings ?? undefined)
      .then(setRecipe)
      .catch(() => undefined);

  const patchInteraction = async (patch: Parameters<typeof recipesApi.updateInteraction>[1], msg: string) => {
    setInteractionBusy(true);
    setInteractionMsg(null);
    try {
      const updated = await recipesApi.updateInteraction(id, patch);
      setMine(updated);
      setInteractionMsg(msg);
      if ('rating' in patch || 'review_text' in patch) {
        refreshRecipeStats();
        loadReviews(0);
      }
    } catch (err) {
      setInteractionMsg(errorMessage(err));
    } finally {
      setInteractionBusy(false);
    }
  };

  const clearInteraction = async () => {
    if (!confirm('Remove your rating, review and bookmark for this recipe?')) return;
    setInteractionBusy(true);
    try {
      await recipesApi.deleteInteraction(id);
      setMine(null);
      setReviewDraft('');
      setInteractionMsg('Cleared.');
      refreshRecipeStats();
      loadReviews(0);
    } catch (err) {
      setInteractionMsg(errorMessage(err));
    } finally {
      setInteractionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!recipe || !confirm(`Delete “${recipe.title}”? This cannot be undone.`)) return;
    try {
      await recipesApi.remove(recipe.id);
      navigate('/recipes', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setError("This recipe is used in a meal plan, so it can't be deleted. Remove it from the meal plan first.");
      else setError(errorMessage(err));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) return <Spinner full />;
  if (notFound)
    return (
      <div className="container page">
        <EmptyState title="Recipe not found">
          <Link to="/recipes" className="btn btn--primary">Back to recipes</Link>
        </EmptyState>
      </div>
    );
  if (!recipe)
    return (
      <div className="container page">
        <ErrorBanner message={error ?? 'Could not load the recipe.'} />
      </div>
    );

  const cat = categoryInfo(recipe.category);
  // The category, then each meal time, as links back into the recipe browser.
  const heroLinks = [
    ...(cat ? [{ to: `/recipes?category=${cat.value}`, label: cat.label }] : []),
    ...recipe.meal_types.flatMap((t) => {
      const info = mealTypeInfo(t);
      return info ? [{ to: `/recipes?meal_type=${info.value}`, label: info.label }] : [];
    }),
  ];
  const canEdit = isAdmin || recipe.owner_sub === user?.id;
  const hasNutrition = [recipe.calories, recipe.protein_g, recipe.carbs_g, recipe.fat_g].some((v) => v !== null && v !== undefined);

  return (
    <article className="recipe-page">
      <header className="recipe-hero">
        <img
          className="recipe-hero__img"
          src={recipeImage(recipe)}
          alt=""
          onError={(e) => {
            const fb = fallbackImage(recipe.id);
            if (!e.currentTarget.src.endsWith(fb)) e.currentTarget.src = fb;
          }}
        />
        <div className="recipe-hero__overlay">
          <div className="container">
            <Link to="/recipes" className="back-link">← All recipes</Link>
            {heroLinks.length > 0 && (
              <p className="eyebrow recipe-hero__category">
                {heroLinks.map((l, i) => (
                  <Fragment key={l.to}>
                    {i > 0 && ' · '}
                    <Link to={l.to}>{l.label}</Link>
                  </Fragment>
                ))}
              </p>
            )}
            <h1 className="recipe-hero__title">{recipe.title}</h1>
            <span className="underline-bar" aria-hidden />
            {recipe.tags.length > 0 && (
              <ul className="tag-list tag-list--hero">
                {recipe.tags.map((t) => (
                  <li key={t}>
                    <Link className="tag-link" to={`/recipes?tag=${encodeURIComponent(t)}`}>#{t}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </header>

      <div className="container page">
        {error && <ErrorBanner message={error} />}

        <div className="meta-strip">
          <div className="meta-strip__item">
            <span className="meta-strip__label">Servings</span>
            <span className="stepper">
              <button type="button" aria-label="Fewer servings" disabled={!servings || servings <= 1} onClick={() => setServings((s) => Math.max(1, (s ?? 1) - 1))}>−</button>
              <span className="meta-strip__value" aria-live="polite">{servings}</span>
              <button type="button" aria-label="More servings" disabled={!servings || servings >= 100} onClick={() => setServings((s) => Math.min(100, (s ?? 1) + 1))}>+</button>
            </span>
          </div>
          <div className="meta-strip__item">
            <span className="meta-strip__label">Prep time</span>
            <span className="meta-strip__value">{recipe.prep_minutes} <small>min</small></span>
          </div>
          <div className="meta-strip__item">
            <span className="meta-strip__label">Rating</span>
            <span className="meta-strip__value">
              {recipe.rating_avg ? recipe.rating_avg.toFixed(1) : '—'} <StarRating value={recipe.rating_avg} size="sm" count={recipe.rating_count} />
            </span>
          </div>
          {canEdit && (
            <div className="meta-strip__actions">
              <Link to={`/recipes/${recipe.id}/edit`} className="btn btn--pill btn--sm">Edit</Link>
              <button type="button" className="btn btn--danger btn--sm" onClick={handleDelete}>Delete</button>
            </div>
          )}
        </div>

        {recipe.description && <p className="lede">{recipe.description}</p>}

        <div className="recipe-layout">
          <aside className="panel panel--outline ingredients">
            <h2 className="section-title">Ingredients</h2>
            {servings !== baseServings && <p className="muted small">Scaled for {servings} servings (original: {baseServings}).</p>}
            {recipe.ingredients.length === 0 ? (
              <p className="muted">No ingredients listed.</p>
            ) : (
              <ul className="ingredient-list">
                {recipe.ingredients.map((ing) => (
                  <li key={ing.ingredient_id}>
                    {ing.image_url ? (
                      <img className="ingredient-list__thumb" src={ing.image_url} alt="" loading="lazy" />
                    ) : (
                      <span className="ingredient-list__thumb ingredient-list__thumb--blank" aria-hidden>{ing.name.slice(0, 1).toUpperCase()}</span>
                    )}
                    <span>
                      <strong className="accent">{formatQty(ing.quantity)} {ing.unit}</strong> {ing.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className="method">
            <h2 className="section-title">How to make it</h2>
            <span className="underline-bar underline-bar--wide" aria-hidden />
            {recipe.instructions.length === 0 ? (
              <p className="muted">No steps yet.</p>
            ) : (
              <ol className="steps">
                {recipe.instructions.map((s) => (
                  <li key={s.step_number}>
                    <h3 className="step-label">Step {s.step_number}</h3>
                    <p>{s.instruction_text}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {hasNutrition && (
          <section className="nutrition">
            <h2 className="section-title">Nutrition <span className="muted small">per serving</span></h2>
            <table className="spec-table">
              <thead>
                <tr><th>Nutrient</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {recipe.calories != null && <tr><td>Calories</td><td>{recipe.calories} kcal</td></tr>}
                {recipe.protein_g != null && <tr><td>Protein</td><td>{recipe.protein_g} g</td></tr>}
                {recipe.carbs_g != null && <tr><td>Carbohydrates</td><td>{recipe.carbs_g} g</td></tr>}
                {recipe.fat_g != null && <tr><td>Fat</td><td>{recipe.fat_g} g</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        <section className="panel your-take">
          <div className="your-take__head">
            <h2 className="section-title">Your take</h2>
            <button
              type="button"
              className={`btn btn--pill btn--sm ${mine?.is_saved ? 'is-active' : ''}`}
              aria-pressed={!!mine?.is_saved}
              disabled={interactionBusy}
              onClick={() => patchInteraction({ is_saved: !mine?.is_saved }, mine?.is_saved ? 'Removed from saved.' : 'Saved to your list.')}
            >
              {mine?.is_saved ? '★ Saved' : '☆ Save recipe'}
            </button>
          </div>
          <div className="your-take__rating">
            <span className="field__label">Your rating</span>
            <StarRating value={mine?.rating ?? null} size="lg" onChange={(n) => patchInteraction({ rating: n }, `Rated ${n} star${n > 1 ? 's' : ''}.`)} />
            {mine?.rating && (
              <button type="button" className="link-btn small" disabled={interactionBusy} onClick={() => patchInteraction({ rating: null }, 'Rating removed.')}>
                remove rating
              </button>
            )}
          </div>
          <div className="field">
            <label className="field__label" htmlFor="review">Your review</label>
            <textarea id="review" rows={3} maxLength={5000} placeholder="How did it turn out?" value={reviewDraft} onChange={(e) => setReviewDraft(e.target.value)} />
          </div>
          <div className="your-take__actions">
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={interactionBusy || reviewDraft.trim() === (mine?.review_text ?? '')}
              onClick={() => patchInteraction({ review_text: reviewDraft.trim() || null }, 'Review saved.')}
            >
              Save review
            </button>
            {mine && (
              <button type="button" className="btn btn--ghost btn--sm" disabled={interactionBusy} onClick={clearInteraction}>
                Clear everything
              </button>
            )}
            {interactionMsg && <span className="muted small" role="status">{interactionMsg}</span>}
          </div>
        </section>

        <section className="reviews">
          <h2 className="section-title">Reviews <span className="muted small">({reviewTotal})</span></h2>
          {reviews.length === 0 ? (
            <p className="muted">No reviews yet. Be the first!</p>
          ) : (
            <ul className="review-list">
              {reviews.map((rv) => (
                <li key={rv.id} className="review">
                  <div className="review__head">
                    <span className="avatar avatar--sm" aria-hidden>{rv.user_sub === user?.id ? user.username[0].toUpperCase() : '•'}</span>
                    <strong>{rv.user_sub === user?.id ? 'You' : `Cook ${rv.user_sub.slice(0, 6)}`}</strong>
                    {rv.rating && <StarRating value={rv.rating} size="sm" />}
                    <span className="muted small">{formatDate(rv.updated_at)}</span>
                  </div>
                  {rv.review_text && <p>{rv.review_text}</p>}
                </li>
              ))}
            </ul>
          )}
          {reviews.length < reviewTotal && (
            <button type="button" className="btn btn--pill btn--sm" onClick={() => loadReviews(reviews.length)}>
              More reviews
            </button>
          )}
        </section>
      </div>
    </article>
  );
}
