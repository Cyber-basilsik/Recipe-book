import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { mealsApi } from '../api/meals';
import type { Meal, MealShoppingList } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { CATEGORIES, mealTypeInfo } from '../components/categories';
import { EmptyState, ErrorBanner, Spinner, errorMessage } from '../components/Feedback';
import { fallbackImage, mealImage, recipeImage } from '../components/images';
import { MealBadges } from '../components/MealCard';

function formatPortions(n: number) {
  return String(Math.round(n * 100) / 100);
}

export function MealPage() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [people, setPeople] = useState(1);
  const [shopping, setShopping] = useState<MealShoppingList | null>(null);
  const [shoppingError, setShoppingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);
    setShopping(null);
    setPeople(1);
    mealsApi
      .get(id)
      .then((m) => !cancelled && setMeal(m))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(errorMessage(err));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // The shopping list is summed and scaled by the server; refetch it when the head count changes.
  const hasItems = meal?.id === id && meal.items.length > 0;
  useEffect(() => {
    if (!hasItems) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      mealsApi
        .ingredients(id, people)
        .then((list) => {
          if (cancelled) return;
          setShopping(list);
          setShoppingError(null);
        })
        .catch((err) => !cancelled && setShoppingError(errorMessage(err)));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [id, people, hasItems]);

  /** Run a publish-flow action; they all return the updated meal plan. */
  const act = async (action: () => Promise<Meal>, done: string) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      setMeal(await action());
      setMessage(done);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleReject = () => {
    const note = prompt('Why is this meal plan being turned down? (shown to the owner, optional)');
    if (note === null) return;
    act(() => mealsApi.reject(id, note.trim() || null), 'Request rejected.');
  };

  const handleDelete = async () => {
    if (!meal || !confirm(`Delete “${meal.title}”? This cannot be undone.`)) return;
    try {
      await mealsApi.remove(meal.id);
      navigate('/meal-plans?view=mine', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (loading) return <Spinner full />;
  if (notFound)
    return (
      <div className="container page">
        <EmptyState title="Meal plan not found">
          It may be private to someone else. <Link to="/meal-plans">Back to meal plans</Link>
        </EmptyState>
      </div>
    );
  if (!meal)
    return (
      <div className="container page">
        <ErrorBanner message={error ?? 'Could not load the meal plan.'} />
      </div>
    );

  const mealType = mealTypeInfo(meal.meal_type);
  const isOwner = meal.owner_sub === user?.id;
  const canEdit = isOwner || isAdmin;
  const courses = CATEGORIES.map((c) => ({ info: c, items: meal.items.filter((i) => i.category === c.value) })).filter((g) => g.items.length > 0);
  const hasNutrition = [meal.calories, meal.protein_g, meal.carbs_g, meal.fat_g].some((v) => v !== null && v !== undefined);

  return (
    <article className="recipe-page">
      <header className="recipe-hero">
        <img
          className="recipe-hero__img"
          src={mealImage(meal)}
          alt=""
          onError={(e) => {
            const fb = fallbackImage(meal.id);
            if (!e.currentTarget.src.endsWith(fb)) e.currentTarget.src = fb;
          }}
        />
        <div className="recipe-hero__overlay">
          <div className="container">
            <Link to="/meal-plans" className="back-link">← All meal plans</Link>
            {mealType && (
              <Link to={`/meal-plans?meal_type=${mealType.value}`} className="eyebrow recipe-hero__category">
                {mealType.label}
              </Link>
            )}
            <h1 className="recipe-hero__title">{meal.title}</h1>
            <span className="underline-bar" aria-hidden />
            {meal.tags.length > 0 && (
              <ul className="tag-list tag-list--hero">
                {meal.tags.map((t) => (
                  <li key={t}>
                    <Link className="tag-link" to={`/meal-plans?tag=${encodeURIComponent(t)}`}>#{t}</Link>
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
            <span className="meta-strip__label">Dishes</span>
            <span className="meta-strip__value">{meal.items.length}</span>
          </div>
          <div className="meta-strip__item">
            <span className="meta-strip__label">Status</span>
            <span className="meta-strip__value"><MealBadges meal={meal} /></span>
          </div>
          <div className="meta-strip__item">
            <span className="meta-strip__label">By</span>
            <span className="meta-strip__value meta-strip__value--text">{isOwner ? 'You' : `Cook ${meal.owner_sub.slice(0, 6)}`}</span>
          </div>
          {canEdit && (
            <div className="meta-strip__actions">
              <Link to={`/meal-plans/${meal.id}/edit`} className="btn btn--pill btn--sm">Edit</Link>
              <button type="button" className="btn btn--danger btn--sm" onClick={handleDelete}>Delete</button>
            </div>
          )}
        </div>

        {canEdit && (
          <section className="panel publish-panel">
            <div>
              <h2 className="section-title">Sharing</h2>
              {meal.visibility === 'PRIVATE' && <p className="muted">Only you can see this meal plan. Ask for it to be published and an admin will review it.</p>}
              {meal.visibility === 'PENDING' && <p className="muted">Waiting for an admin to review this meal plan.</p>}
              {meal.visibility === 'PUBLIC' && <p className="muted">This meal plan is in the public catalog{meal.is_featured ? ' and is featured' : ''}. Editing it sends it back to review.</p>}
              {meal.review_note && meal.visibility !== 'PUBLIC' && (
                <p className="notice" role="note"><strong>An admin turned down the last request:</strong> {meal.review_note}</p>
              )}
              {message && <p className="muted small" role="status">{message}</p>}
            </div>
            <div className="publish-panel__actions">
              {isOwner && meal.visibility === 'PRIVATE' && (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={busy || meal.items.length === 0}
                  title={meal.items.length === 0 ? 'Add at least one recipe first' : undefined}
                  onClick={() => act(() => mealsApi.publish(id), 'Sent for review.')}
                >
                  Request publication
                </button>
              )}
              {meal.visibility === 'PENDING' && (
                <button type="button" className="btn btn--pill btn--sm" disabled={busy} onClick={() => act(() => mealsApi.unpublish(id), 'Request withdrawn.')}>
                  Withdraw request
                </button>
              )}
              {meal.visibility === 'PUBLIC' && (
                <button type="button" className="btn btn--pill btn--sm" disabled={busy} onClick={() => act(() => mealsApi.unpublish(id), 'The meal plan is private again.')}>
                  Make private
                </button>
              )}
              {isAdmin && meal.visibility === 'PENDING' && (
                <>
                  <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => act(() => mealsApi.approve(id), 'Approved and published.')}>
                    Approve
                  </button>
                  <button type="button" className="btn btn--danger btn--sm" disabled={busy} onClick={handleReject}>
                    Reject
                  </button>
                </>
              )}
              {isAdmin && meal.visibility === 'PUBLIC' && (
                <button
                  type="button"
                  className="btn btn--pill btn--sm"
                  disabled={busy}
                  onClick={() => act(() => mealsApi.setFeatured(id, !meal.is_featured), meal.is_featured ? 'No longer featured.' : 'Featured in the catalog.')}
                >
                  {meal.is_featured ? 'Unfeature' : 'Feature'}
                </button>
              )}
            </div>
          </section>
        )}

        {meal.description && <p className="lede meal-lede">{meal.description}</p>}

        {courses.length === 0 ? (
          <EmptyState title="No dishes yet">
            {canEdit ? <Link to={`/meal-plans/${meal.id}/edit`} className="btn btn--primary">Add recipes</Link> : 'This meal plan has no recipes.'}
          </EmptyState>
        ) : (
          <div className="meal-courses">
            {courses.map(({ info, items }) => (
              <section key={info.value} aria-labelledby={`course-${info.value}`}>
                <header className="menu-section__head">
                  <h2 id={`course-${info.value}`} className="section-title meal-courses__title">{items.length > 1 ? info.plural : info.label}</h2>
                  <span className="menu-section__rule" aria-hidden />
                </header>
                <ul className="meal-items">
                  {items.map((item) => (
                    <li key={item.position}>
                      <Link to={`/recipes/${item.recipe_id}`} className="meal-items__media">
                        <img
                          src={recipeImage({ id: item.recipe_id, image_url: item.recipe_image_url, category: item.recipe_category, meal_types: item.recipe_meal_types })}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            const fb = fallbackImage(item.recipe_id);
                            if (!e.currentTarget.src.endsWith(fb)) e.currentTarget.src = fb;
                          }}
                        />
                      </Link>
                      <div className="meal-items__body">
                        <Link to={`/recipes/${item.recipe_id}`} className="meal-items__title">{item.recipe_title}</Link>
                        {item.note && <span className="muted small">{item.note}</span>}
                      </div>
                      <span className="price-like">
                        {formatPortions(item.portions)} portion{item.portions === 1 ? '' : 's'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {meal.items.length > 0 && (
          <section className="panel panel--outline meal-ingredients">
            <header className="meal-ingredients__head">
              <h2 className="section-title">Ingredients <span className="muted small">for {people} {people === 1 ? 'person' : 'people'}</span></h2>
              <span className="stepper">
                <button type="button" aria-label="Fewer people" disabled={people <= 1} onClick={() => setPeople((p) => Math.max(1, p - 1))}>−</button>
                <span className="meta-strip__value" aria-live="polite">{people}</span>
                <button type="button" aria-label="More people" disabled={people >= 100} onClick={() => setPeople((p) => Math.min(100, p + 1))}>+</button>
              </span>
            </header>
            {shoppingError && <ErrorBanner message={shoppingError} />}
            {!shopping ? (
              !shoppingError && <Spinner />
            ) : shopping.items.length === 0 ? (
              <p className="muted">No ingredients listed.</p>
            ) : (
              <ul className="ingredient-list ingredient-list--columns">
                {shopping.items.map((ing) => (
                  <li key={`${ing.ingredient_id}|${ing.unit}`}>
                    {ing.image_url ? (
                      <img className="ingredient-list__thumb" src={ing.image_url} alt="" loading="lazy" />
                    ) : (
                      <span className="ingredient-list__thumb ingredient-list__thumb--blank" aria-hidden>{ing.name.slice(0, 1).toUpperCase()}</span>
                    )}
                    <span>
                      <strong className="accent">{formatPortions(ing.quantity)} {ing.unit}</strong> {ing.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {hasNutrition && (
          <section className="nutrition">
            <h2 className="section-title">Nutrition <span className="muted small">per person</span></h2>
            <table className="spec-table">
              <thead>
                <tr><th>Nutrient</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {meal.calories != null && <tr><td>Calories</td><td>{meal.calories} kcal</td></tr>}
                {meal.protein_g != null && <tr><td>Protein</td><td>{meal.protein_g} g</td></tr>}
                {meal.carbs_g != null && <tr><td>Carbohydrates</td><td>{meal.carbs_g} g</td></tr>}
                {meal.fat_g != null && <tr><td>Fat</td><td>{meal.fat_g} g</td></tr>}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </article>
  );
}
