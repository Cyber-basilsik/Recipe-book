import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { mealsApi } from '../api/meals';
import type { Meal, MealType, MealVisibility } from '../api/types';
import { MEAL_TYPES, mealTypeInfo } from '../components/categories';
import { EmptyState, ErrorBanner, Spinner, errorMessage } from '../components/Feedback';
import { MealCard, visibilityLabel } from '../components/MealCard';

const PAGE = 24;

type View = 'catalog' | 'mine';
const VIEW_LABEL: Record<View, string> = { catalog: 'Catalog', mine: 'My meal plans' };
const VISIBILITIES: MealVisibility[] = ['PRIVATE', 'PENDING', 'PUBLIC'];

export function MealsPage() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'mine' ? 'mine' : 'catalog';
  const mealType = mealTypeInfo(params.get('meal_type'))?.value;
  const tag = params.get('tag') || undefined;
  const q = params.get('q') ?? '';
  const rawVisibility = (params.get('visibility') ?? '').toUpperCase() as MealVisibility;
  const visibility = view === 'mine' && VISIBILITIES.includes(rawVisibility) ? rawVisibility : undefined;

  const [search, setSearch] = useState(q);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => setSearch(q), [q]);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '' || (k === 'view' && v === 'catalog')) next.delete(k);
        else next.set(k, v);
      }
      setParams(next);
    },
    [params, setParams],
  );

  const fetchPage = useCallback(
    (offset: number) => {
      const common = { q: q || undefined, tag, meal_type: mealType, limit: PAGE, offset };
      return view === 'mine' ? mealsApi.list({ ...common, visibility }) : mealsApi.catalog(common);
    },
    [view, q, tag, mealType, visibility],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPage(0)
      .then((res) => {
        if (cancelled) return;
        setMeals(res.items);
        setTotal(res.total);
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fetchPage, reload]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await fetchPage(meals.length);
      setMeals((prev) => [...prev, ...res.items]);
      setTotal(res.total);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    updateParams({ q: search.trim() || null });
  };

  const selectMealType = (t: MealType | null) => updateParams({ meal_type: t });
  const filtered = !!(q || tag || mealType || visibility);

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Recipes, combined</p>
          <h1 className="page-title">Meal plans</h1>
          <span className="underline-bar" aria-hidden />
        </div>
        <Link to="/meal-plans/new" className="btn btn--primary">New meal plan</Link>
      </div>

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Which meal plans">
          {(['catalog', 'mine'] as View[]).map((v) => (
            <button key={v} type="button" className={view === v ? 'is-active' : ''} aria-pressed={view === v} onClick={() => updateParams({ view: v, visibility: null })}>
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
        <form className="search" role="search" onSubmit={onSearch}>
          <label htmlFor="meal-search" className="sr-only">Search meal plans</label>
          <input id="meal-search" type="search" placeholder="Search meal plans by title…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn btn--pill">Search</button>
        </form>
      </div>

      <div className="chip-row" role="group" aria-label="Filter by meal type">
        <button type="button" className={`chip ${!mealType ? 'is-active' : ''}`} aria-pressed={!mealType} onClick={() => selectMealType(null)}>
          All
        </button>
        {MEAL_TYPES.map((t) => (
          <button key={t.value} type="button" className={`chip ${mealType === t.value ? 'is-active' : ''}`} aria-pressed={mealType === t.value} onClick={() => selectMealType(mealType === t.value ? null : t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      {view === 'mine' && (
        <div className="chip-row" role="group" aria-label="Filter by visibility">
          <button type="button" className={`chip ${!visibility ? 'is-active' : ''}`} aria-pressed={!visibility} onClick={() => updateParams({ visibility: null })}>
            Any status
          </button>
          {VISIBILITIES.map((v) => (
            <button key={v} type="button" className={`chip ${visibility === v ? 'is-active' : ''}`} aria-pressed={visibility === v} onClick={() => updateParams({ visibility: visibility === v ? null : v })}>
              {visibilityLabel(v)}
            </button>
          ))}
        </div>
      )}

      <p className="muted">
        {loading ? 'Loading…' : `${total} meal plan${total === 1 ? '' : 's'}`}
        {q && <> matching “{q}” <button type="button" className="link-btn" onClick={() => updateParams({ q: null })}>clear</button></>}
        {tag && <> · tagged #{tag} <button type="button" className="link-btn" onClick={() => updateParams({ tag: null })}>clear</button></>}
      </p>

      {error && <ErrorBanner message={error} onRetry={() => setReload((n) => n + 1)} />}

      {loading ? (
        <Spinner />
      ) : meals.length === 0 ? (
        !error && (
          <EmptyState title={view === 'mine' ? 'No meal plans of your own yet' : 'No public meal plans yet'}>
            {filtered ? (
              'Try clearing your filters.'
            ) : view === 'mine' ? (
              <Link to="/meal-plans/new" className="btn btn--primary">Build your first meal plan</Link>
            ) : (
              'Meal plans appear here once their owner publishes them and an admin approves.'
            )}
          </EmptyState>
        )
      ) : (
        <>
          <div className="recipe-grid">
            {meals.map((m, i) => (
              <MealCard key={m.id} meal={m} index={i} showVisibility={view === 'mine'} onTagClick={(t) => updateParams({ tag: t })} onCategoryClick={selectMealType} />
            ))}
          </div>
          {meals.length < total && (
            <div className="load-more">
              <button type="button" className="btn btn--pill" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
