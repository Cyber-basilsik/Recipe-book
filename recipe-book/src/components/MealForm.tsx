import { useEffect, useState, type FormEvent } from 'react';
import { recipesApi } from '../api/recipes';
import type { Category, Meal, MealType, MealWrite, Recipe } from '../api/types';
import { CATEGORIES, MEAL_TYPES, categoryInfo, mealTypeInfo } from './categories';
import { ErrorBanner, errorMessage } from './Feedback';
import { TagInput } from './TagInput';

const MAX_ITEMS = 30;
const PICKER_LIMIT = 8;
const URL_RE = /^https?:\/\/\S+$/;

interface ItemRow {
  key: number;
  recipeId: number;
  title: string;
  category: Category;
  portions: string;
  note: string;
}

let keySeq = 0;
const nextKey = () => ++keySeq;

interface Props {
  initial?: Meal;
  submitLabel: string;
  onSubmit: (data: MealWrite) => Promise<void>;
  onCancel: () => void;
}

export function MealForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [mealType, setMealType] = useState<MealType | null>(mealTypeInfo(initial?.meal_type)?.value ?? null);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [items, setItems] = useState<ItemRow[]>(
    (initial?.items ?? []).map((i) => ({
      key: nextKey(),
      recipeId: i.recipe_id,
      title: i.recipe_title,
      category: i.category,
      portions: String(i.portions),
      note: i.note ?? '',
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imgOk, setImgOk] = useState(true);

  // Recipe picker
  const [query, setQuery] = useState('');
  const [pickCategory, setPickCategory] = useState<Category | null>(null);
  const [results, setResults] = useState<Recipe[]>([]);
  const [resultTotal, setResultTotal] = useState(0);
  const [searching, setSearching] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setSearching(true);
    const handle = setTimeout(() => {
      recipesApi
        .list({ q: query.trim() || undefined, category: pickCategory ?? undefined, limit: PICKER_LIMIT })
        .then((res) => {
          if (cancelled) return;
          setResults(res.items);
          setResultTotal(res.total);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setResultTotal(0);
        })
        .finally(() => !cancelled && setSearching(false));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, pickCategory]);

  const full = items.length >= MAX_ITEMS;
  const addRecipe = (r: Recipe) => {
    if (full) return;
    setItems((rows) => [
      ...rows,
      { key: nextKey(), recipeId: r.id, title: r.title, category: categoryInfo(r.category)?.value ?? 'MAIN', portions: '1', note: '' },
    ]);
  };
  const updateItem = (key: number, patch: Partial<ItemRow>) =>
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (from: number, to: number) =>
    setItems((rows) => {
      if (to < 0 || to >= rows.length) return rows;
      const next = [...rows];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUrl = imageUrl.trim();
    if (trimmedUrl && !URL_RE.test(trimmedUrl)) {
      setError('Image URL must start with http:// or https://');
      return;
    }
    for (const r of items) {
      const p = Number(r.portions);
      if (!(p > 0 && p <= 100)) {
        setError(`Portions for "${r.title}" must be greater than 0 and at most 100.`);
        return;
      }
    }

    const data: MealWrite = {
      title: title.trim(),
      description: description.trim() || null,
      image_url: trimmedUrl || null,
      meal_type: mealType,
      tags,
      items: items.map((r) => ({
        recipe_id: r.recipeId,
        category: r.category,
        note: r.note.trim() || null,
        portions: Number(r.portions),
      })),
    };

    setSaving(true);
    try {
      await onSubmit(data);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      {error && <ErrorBanner message={error} />}

      <section className="form-section">
        <h2 className="section-title">The basics</h2>
        <div className="form-grid">
          <div className="field field--full">
            <label className="field__label" htmlFor="mf-title">Title</label>
            <input id="mf-title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sunday lunch" />
          </div>
          <div className="field field--full">
            <label className="field__label" htmlFor="mf-desc">Description</label>
            <textarea id="mf-desc" rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's the occasion?" />
          </div>
          <div className="field field--full">
            <label className="field__label" htmlFor="mf-img">Image URL</label>
            <input
              id="mf-img"
              type="url"
              maxLength={2048}
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setImgOk(true);
              }}
              placeholder="https://example.com/photo.jpg"
            />
            <span className="field__hint">Left empty, the meal plan uses the picture of its first dish.</span>
            {imageUrl.trim() && (
              <div className="img-preview">
                {imgOk ? (
                  <img src={imageUrl.trim()} alt="Preview" onError={() => setImgOk(false)} />
                ) : (
                  <span className="muted">Couldn't load that image.</span>
                )}
              </div>
            )}
          </div>
          <fieldset className="field field--full pill-radio">
            <legend className="field__label">Meal type</legend>
            <div className="pill-radio__options">
              {[...MEAL_TYPES.map((t) => ({ value: t.value as MealType | null, label: t.label })), { value: null, label: 'None' }].map((opt) => (
                <label key={opt.label} className={`pill-radio__option ${mealType === opt.value ? 'is-active' : ''}`}>
                  <input type="radio" name="mf-meal-type" checked={mealType === opt.value} onChange={() => setMealType(opt.value)} />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="field field--full">
            <TagInput label="Tags" value={tags} onChange={setTags} placeholder="e.g. family, weekend — press Enter" />
          </div>
        </div>
      </section>

      <section className="form-section">
        <h2 className="section-title">Dishes <span className="muted small">{items.length} of {MAX_ITEMS}</span></h2>
        {items.length === 0 ? (
          <p className="muted">No recipes yet — pick some below.</p>
        ) : (
          <div className="rows">
            {items.map((row, i) => (
              <div className="row-card" key={row.key}>
                <span className="badge-num badge-num--static">{String(i + 1).padStart(2, '0')}</span>
                <div className="row-card__fields row-card__fields--meal">
                  <strong className="row-card__name">{row.title}</strong>
                  <select aria-label={`Category for ${row.title}`} value={row.category} onChange={(e) => updateItem(row.key, { category: e.target.value as Category })}>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <input aria-label={`Portions of ${row.title} per person`} title="Portions per person" type="number" min={0} max={100} step="any" placeholder="Portions" value={row.portions} onChange={(e) => updateItem(row.key, { portions: e.target.value })} />
                  <input aria-label={`Note for ${row.title}`} maxLength={200} placeholder="Note (optional), e.g. palate cleanser" value={row.note} onChange={(e) => updateItem(row.key, { note: e.target.value })} />
                </div>
                <div className="row-card__actions">
                  <button type="button" className="icon-btn" aria-label="Move up" onClick={() => move(i, i - 1)}>↑</button>
                  <button type="button" className="icon-btn" aria-label="Move down" onClick={() => move(i, i + 1)}>↓</button>
                  <button type="button" className="icon-btn icon-btn--danger" aria-label={`Remove ${row.title}`} onClick={() => setItems((r) => r.filter((x) => x.key !== row.key))}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="recipe-picker">
          <label className="field__label" htmlFor="mf-pick">Add a recipe</label>
          <input
            id="mf-pick"
            type="search"
            placeholder="Search recipes by title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
          />
          <div className="chip-row" role="group" aria-label="Filter recipes by category">
            <button type="button" className={`chip ${!pickCategory ? 'is-active' : ''}`} aria-pressed={!pickCategory} onClick={() => setPickCategory(null)}>
              All
            </button>
            {CATEGORIES.map((c) => (
              <button key={c.value} type="button" className={`chip ${pickCategory === c.value ? 'is-active' : ''}`} aria-pressed={pickCategory === c.value} onClick={() => setPickCategory(c.value)}>
                {c.plural}
              </button>
            ))}
          </div>
          {full && <span className="field__hint">A meal plan can hold at most {MAX_ITEMS} dishes.</span>}
          {!searching && resultTotal > results.length && (
            <span className="field__hint">Showing {results.length} of {resultTotal} — type to narrow.</span>
          )}
          <ul className="recipe-picker__results" aria-live="polite">
            {!searching && results.length === 0 && <li className="muted small">No recipes found.</li>}
            {results.map((r) => (
              <li key={r.id}>
                <span>
                  {r.title}
                  {categoryInfo(r.category) && <span className="muted small"> · {categoryInfo(r.category)?.label}</span>}
                </span>
                <button type="button" className="btn btn--pill btn--sm" disabled={full} onClick={() => addRecipe(r)}>
                  + Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
