import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { recipesApi, type RecipeQuery } from '../api/recipes';
import type { Category, MealType, Recipe, TagCount } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { BrowseSidebar, type Scope } from '../components/BrowseSidebar';
import { CATEGORIES, UNCATEGORISED, categoryInfo, mealTypeInfo, parseCategory, type CategoryInfo } from '../components/categories';
import { BracketTitle, EmptyState, ErrorBanner, Spinner, errorMessage } from '../components/Feedback';
import { photos } from '../components/images';
import { RecipeCard } from '../components/RecipeCard';

const PAGE = 24;
// Fills whole rows at 3, 2 and 1 columns.
const SECTION_SIZE = 6;

type Counts = Partial<Record<Category | 'ALL', number>>;

interface SectionProps {
  info: CategoryInfo;
  count: number | undefined;
  filters: RecipeQuery;
  savedIds: Set<number>;
  onToggleSave: (r: Recipe) => void;
  onSeeAll: (c: Category) => void;
  onTag: (t: string) => void;
}

/** One "menu" section in the All view: a category heading and its first few recipes. */
function CategorySection({ info, count, filters, savedIds, onToggleSave, onSeeAll, onTag }: SectionProps) {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRecipes(null);
    setError(null);
    recipesApi
      .list({ ...filters, category: info.value, limit: SECTION_SIZE })
      .then((res) => !cancelled && setRecipes(res.items))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [filters, info.value]);

  return (
    <section className="menu-section" aria-labelledby={`sec-${info.value}`}>
      <header className="menu-section__head">
        <h2 id={`sec-${info.value}`} className="menu-section__title">{info.plural}</h2>
        <span className="menu-section__rule" aria-hidden />
        <button type="button" className="btn btn--pill btn--sm" onClick={() => onSeeAll(info.value)}>
          See all{count !== undefined ? ` (${count})` : ''} →
        </button>
      </header>
      {error && <ErrorBanner message={error} />}
      {!recipes && !error ? (
        <Spinner />
      ) : (
        <div className="recipe-grid recipe-grid--section">
          {recipes?.map((r, i) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              index={i}
              showCategory={false}
              saved={savedIds.has(r.id)}
              onToggleSave={onToggleSave}
              onTagClick={onTag}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function HomePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tag = params.get('tag');
  const q = params.get('q') ?? '';
  const scope = (['all', 'mine', 'saved'].includes(params.get('scope') ?? '') ? params.get('scope') : 'all') as Scope;
  const category = parseCategory(params.get('category'));
  const mealType = mealTypeInfo(params.get('meal_type'))?.value ?? null;

  const [search, setSearch] = useState(q);
  const [tags, setTags] = useState<TagCount[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [counts, setCounts] = useState<Counts>({});
  const [uncategorised, setUncategorised] = useState(0);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  useEffect(() => setSearch(q), [q]);

  // Filters shared by the counts, the sections and the grid (everything but category).
  const filters = useMemo<RecipeQuery>(
    () => ({ q: q || undefined, tag: tag || undefined, meal_type: mealType ?? undefined, mine: scope === 'mine', saved: scope === 'saved' }),
    [q, tag, mealType, scope],
  );

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '' || (k === 'scope' && v === 'all')) next.delete(k);
        else next.set(k, v);
      }
      setParams(next);
    },
    [params, setParams],
  );

  const selectCategory = useCallback(
    (c: Category | null) => {
      updateParams({ category: c });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [updateParams],
  );
  const selectTag = useCallback((t: string | null) => updateParams({ tag: t }), [updateParams]);
  const selectMealType = useCallback(
    (t: MealType | null) => {
      updateParams({ meal_type: t });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [updateParams],
  );

  // Tags and saved ids load once.
  useEffect(() => {
    recipesApi
      .tags()
      .then((res) => setTags(res.items))
      .catch(() => setTags([]))
      .finally(() => setTagsLoading(false));
    recipesApi
      .list({ saved: true, limit: 200 })
      .then((res) => setSavedIds(new Set(res.items.map((r) => r.id))))
      .catch(() => undefined);
  }, []);

  // Per-category counts under the current filters.
  useEffect(() => {
    let cancelled = false;
    setCounts({});
    Promise.all([
      recipesApi.list({ ...filters, limit: 1 }).then((r) => r.total),
      ...CATEGORIES.map((c) => recipesApi.list({ ...filters, category: c.value, limit: 1 }).then((r) => r.total)),
    ])
      .then(([all, ...perCat]) => {
        if (cancelled) return;
        const next: Counts = { ALL: all };
        CATEGORIES.forEach((c, i) => (next[c.value] = perCat[i]));
        setCounts(next);
        setUncategorised(Math.max(0, all - perCat.reduce((a, b) => a + b, 0)));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [filters]);

  // Grid view (a category, or uncategorised) with pagination.
  const load = useCallback(
    async (offset = 0) => {
      if (category === null) return;
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        if (category === UNCATEGORISED) {
          // The API can't filter for "no category", so filter the first 200 client-side.
          const res = await recipesApi.list({ ...filters, limit: 200 });
          const items = res.items.filter((r) => !r.category);
          setRecipes(items);
          setTotal(items.length);
        } else {
          const res = await recipesApi.list({ ...filters, category, limit: PAGE, offset });
          setRecipes((prev) => (offset === 0 ? res.items : [...prev, ...res.items]));
          setTotal(res.total);
        }
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [category, filters],
  );

  useEffect(() => {
    load(0);
  }, [load]);

  const toggleSave = useCallback(
    async (recipe: Recipe) => {
      const wasSaved = savedIds.has(recipe.id);
      const next = new Set(savedIds);
      if (wasSaved) next.delete(recipe.id);
      else next.add(recipe.id);
      setSavedIds(next);
      try {
        await recipesApi.updateInteraction(recipe.id, { is_saved: !wasSaved });
        if (scope === 'saved' && wasSaved) {
          setRecipes((rs) => rs.filter((r) => r.id !== recipe.id));
          setTotal((t) => t - 1);
        }
      } catch (err) {
        setSavedIds(savedIds);
        setError(errorMessage(err));
      }
    },
    [savedIds, scope],
  );

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    updateParams({ q: search.trim() || null });
  };

  const activeInfo = category && category !== UNCATEGORISED ? categoryInfo(category) : undefined;
  const mealTypeLabel = mealTypeInfo(mealType)?.plural;
  const heading = activeInfo ? activeInfo.plural : category === UNCATEGORISED ? 'Uncategorised' : mealTypeLabel ?? 'The menu';
  const shownTotal = category === null ? counts.ALL : total;
  const sections = CATEGORIES.filter((c) => counts[c.value] === undefined || counts[c.value]! > 0);
  const countsLoaded = counts.ALL !== undefined;

  return (
    <div className="home">
      <section className="hero" style={{ ['--hero-bg' as string]: `url(${photos.dinner})` }}>
        <div className="container hero__inner">
          <div>
            <p className="eyebrow">Welcome, {user?.username}</p>
            <BracketTitle sub="Starters to desserts — browse by course or meal time, filter by tag, save your favourites.">
              Recipe Book
            </BracketTitle>
          </div>
          <form className="search" role="search" onSubmit={onSearch}>
            <label htmlFor="search" className="sr-only">Search recipes</label>
            <input id="search" type="search" placeholder="Search recipes by title…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="submit" className="btn btn--primary">Search</button>
          </form>
        </div>
      </section>

      <div className="container home-layout">
        <BrowseSidebar
          category={category === UNCATEGORISED ? null : category}
          mealType={mealType}
          counts={counts}
          tags={tags}
          tagsLoading={tagsLoading}
          tag={tag}
          scope={scope}
          onCategory={selectCategory}
          onMealType={selectMealType}
          onTag={selectTag}
          onScope={(s) => updateParams({ scope: s })}
          onClear={() => updateParams({ tag: null, scope: null, meal_type: null })}
        />

        <div className="home-main">
          <div className="section-head">
            <p className="eyebrow">{category !== null ? 'Category' : mealType ? 'Meal time' : 'All categories'}</p>
            <h2 className="section-title">{heading}</h2>
            <span className="underline-bar" aria-hidden />
            <p className="muted">
              {shownTotal === undefined || (category !== null && loading) ? 'Loading…' : `${shownTotal} recipe${shownTotal === 1 ? '' : 's'}`}
              {q && <> matching “{q}” <button type="button" className="link-btn" onClick={() => updateParams({ q: null })}>clear</button></>}
              {category !== null && <> · <button type="button" className="link-btn" onClick={() => selectCategory(null)}>back to all categories</button></>}
            </p>
          </div>

          {error && <ErrorBanner message={error} onRetry={() => load(0)} />}

          {category === null ? (
            countsLoaded && counts.ALL === 0 ? (
              <EmptyState title="No recipes here yet">
                {scope === 'saved' ? (
                  'Save a recipe with the bookmark icon to see it here.'
                ) : mealType || tag || q ? (
                  'Try clearing your filters.'
                ) : (
                  <Link to="/recipes/new" className="btn btn--primary">Add the first one</Link>
                )}
              </EmptyState>
            ) : (
              <div className="menu">
                {sections.map((c) => (
                  <CategorySection
                    key={c.value}
                    info={c}
                    count={counts[c.value]}
                    filters={filters}
                    savedIds={savedIds}
                    onToggleSave={toggleSave}
                    onSeeAll={selectCategory}
                    onTag={(t) => selectTag(t)}
                  />
                ))}
                {uncategorised > 0 && (
                  <div className="menu-other">
                    <button type="button" className="btn btn--pill" onClick={() => updateParams({ category: UNCATEGORISED })}>
                      Uncategorised recipes ({uncategorised}) →
                    </button>
                  </div>
                )}
              </div>
            )
          ) : loading ? (
            <Spinner />
          ) : recipes.length === 0 ? (
            <EmptyState title={`No ${activeInfo ? activeInfo.label.toLowerCase() : 'uncategorised'} recipes yet`}>
              {tag || q || mealType || scope !== 'all' ? 'Try clearing your filters.' : <Link to="/recipes/new" className="btn btn--primary">Add one</Link>}
            </EmptyState>
          ) : (
            <>
              <div className="recipe-grid">
                {recipes.map((r, i) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    index={i}
                    showCategory={category === UNCATEGORISED}
                    saved={savedIds.has(r.id)}
                    onToggleSave={toggleSave}
                    onTagClick={(t) => selectTag(t)}
                    onCategoryClick={selectCategory}
                  />
                ))}
              </div>
              {category !== UNCATEGORISED && recipes.length < total && (
                <div className="load-more">
                  <button type="button" className="btn btn--pill" disabled={loadingMore} onClick={() => load(recipes.length)}>
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
