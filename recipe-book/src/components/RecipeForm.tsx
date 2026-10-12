import { useState, type FormEvent } from 'react';
import type { Category, MealType, Recipe, RecipeWrite } from '../api/types';
import { CATEGORIES, MEAL_TYPES, categoryInfo } from './categories';
import { ErrorBanner } from './Feedback';
import { TagInput } from './TagInput';

interface IngredientRow {
  key: number;
  name: string;
  quantity: string;
  unit: string;
  tags: string[];
  imageUrl: string;
}
interface StepRow {
  key: number;
  text: string;
}

let keySeq = 0;
const nextKey = () => ++keySeq;

const URL_RE = /^https?:\/\/\S+$/;
const blankIngredient = (): IngredientRow => ({ key: nextKey(), name: '', quantity: '', unit: '', tags: [], imageUrl: '' });

const numOrEmpty = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

interface Props {
  initial?: Recipe;
  submitLabel: string;
  onSubmit: (data: RecipeWrite) => Promise<void>;
  onCancel: () => void;
}

export function RecipeForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [category, setCategory] = useState<Category | null>(categoryInfo(initial?.category)?.value ?? null);
  const [mealTypes, setMealTypes] = useState<MealType[]>(initial?.meal_types ?? []);
  const [servings, setServings] = useState(String(initial?.servings ?? 4));
  const [prep, setPrep] = useState(String(initial?.prep_minutes ?? 30));
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [calories, setCalories] = useState(numOrEmpty(initial?.calories));
  const [protein, setProtein] = useState(numOrEmpty(initial?.protein_g));
  const [carbs, setCarbs] = useState(numOrEmpty(initial?.carbs_g));
  const [fat, setFat] = useState(numOrEmpty(initial?.fat_g));
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initial?.ingredients.length
      ? initial.ingredients.map((i) => ({
          key: nextKey(),
          name: i.name,
          quantity: String(i.quantity),
          unit: i.unit,
          tags: [],
          imageUrl: '',
        }))
      : [blankIngredient()],
  );
  const [steps, setSteps] = useState<StepRow[]>(
    initial?.instructions.length
      ? initial.instructions.map((s) => ({ key: nextKey(), text: s.instruction_text }))
      : [{ key: nextKey(), text: '' }],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imgOk, setImgOk] = useState(true);

  const updateIng = (key: number, patch: Partial<IngredientRow>) =>
    setIngredients((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const updateStep = (key: number, text: string) =>
    setSteps((rows) => rows.map((r) => (r.key === key ? { ...r, text } : r)));
  const move = <T,>(list: T[], from: number, to: number) => {
    if (to < 0 || to >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUrl = imageUrl.trim();
    if (trimmedUrl && !URL_RE.test(trimmedUrl)) {
      setError('Image URL must start with http:// or https://');
      return;
    }

    const lines = ingredients.filter((r) => r.name.trim());
    for (const r of lines) {
      const q = Number(r.quantity);
      if (!(q > 0)) {
        setError(`Quantity for "${r.name}" must be greater than 0.`);
        return;
      }
      if (r.imageUrl.trim() && !URL_RE.test(r.imageUrl.trim())) {
        setError(`Image URL for "${r.name}" must start with http:// or https://`);
        return;
      }
    }

    const optNum = (s: string) => (s.trim() === '' ? undefined : Number(s));
    const data: RecipeWrite = {
      title: title.trim(),
      description: description.trim() || null,
      image_url: trimmedUrl || null,
      category,
      meal_types: MEAL_TYPES.map((t) => t.value).filter((v) => mealTypes.includes(v)),
      servings: Number(servings) || 1,
      prep_minutes: Number(prep) || 0,
      tags,
      calories: optNum(calories),
      protein_g: optNum(protein),
      carbs_g: optNum(carbs),
      fat_g: optNum(fat),
      ingredients: lines.map((r) => ({
        name: r.name.trim(),
        quantity: Number(r.quantity),
        unit: r.unit.trim(),
        ...(r.tags.length ? { tags: r.tags } : {}),
        ...(r.imageUrl.trim() ? { image_url: r.imageUrl.trim() } : {}),
      })),
      instructions: steps.filter((s) => s.text.trim()).map((s) => ({ instruction_text: s.text.trim() })),
    };
    // Drop undefined nutrition fields so the API keeps its own defaults.
    for (const k of ['calories', 'protein_g', 'carbs_g', 'fat_g'] as const) if (data[k] === undefined) delete data[k];

    setSaving(true);
    try {
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the recipe.');
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
            <label className="field__label" htmlFor="rf-title">Title</label>
            <input id="rf-title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Jollof rice" />
          </div>
          <div className="field field--full">
            <label className="field__label" htmlFor="rf-desc">Description</label>
            <textarea id="rf-desc" rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A smoky, one-pot West African classic…" />
          </div>
          <div className="field field--full">
            <label className="field__label" htmlFor="rf-img">Image URL</label>
            <input
              id="rf-img"
              type="url"
              maxLength={2048}
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setImgOk(true);
              }}
              placeholder="https://example.com/photo.jpg"
            />
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
            <legend className="field__label">Category</legend>
            <div className="pill-radio__options">
              {[...CATEGORIES.map((c) => ({ value: c.value as Category | null, label: c.label })), { value: null, label: 'None' }].map((opt) => (
                <label key={opt.label} className={`pill-radio__option ${category === opt.value ? 'is-active' : ''}`}>
                  <input type="radio" name="rf-category" checked={category === opt.value} onChange={() => setCategory(opt.value)} />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="field field--full pill-radio">
            <legend className="field__label">Meal times <span className="muted">(any that fit)</span></legend>
            <div className="pill-radio__options">
              {MEAL_TYPES.map((t) => {
                const on = mealTypes.includes(t.value);
                return (
                  <label key={t.value} className={`pill-radio__option ${on ? 'is-active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setMealTypes((ts) => (on ? ts.filter((x) => x !== t.value) : [...ts, t.value]))}
                    />
                    {t.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="field">
            <label className="field__label" htmlFor="rf-serv">Servings</label>
            <input id="rf-serv" type="number" min={1} max={100} required value={servings} onChange={(e) => setServings(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="rf-prep">Prep (minutes)</label>
            <input id="rf-prep" type="number" min={0} max={1440} value={prep} onChange={(e) => setPrep(e.target.value)} />
          </div>
          <div className="field field--full">
            <TagInput label="Tags" value={tags} onChange={setTags} placeholder="e.g. dinner, vegetarian — press Enter" />
          </div>
        </div>
      </section>

      <section className="form-section">
        <h2 className="section-title">Nutrition <span className="muted small">per serving</span></h2>
        <div className="form-grid form-grid--4">
          <div className="field">
            <label className="field__label" htmlFor="rf-cal">Calories</label>
            <input id="rf-cal" type="number" min={0} max={100000} step={1} value={calories} onChange={(e) => setCalories(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="rf-pro">Protein (g)</label>
            <input id="rf-pro" type="number" min={0} max={10000} step="any" value={protein} onChange={(e) => setProtein(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="rf-carb">Carbs (g)</label>
            <input id="rf-carb" type="number" min={0} max={10000} step="any" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="rf-fat">Fat (g)</label>
            <input id="rf-fat" type="number" min={0} max={10000} step="any" value={fat} onChange={(e) => setFat(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="form-section">
        <h2 className="section-title">Ingredients</h2>
        <div className="rows">
          {ingredients.map((row, i) => (
            <div className="row-card" key={row.key}>
              <span className="badge-num badge-num--static">{String(i + 1).padStart(2, '0')}</span>
              <div className="row-card__fields row-card__fields--ing">
                <input aria-label="Quantity" type="number" min={0} step="any" placeholder="Qty" value={row.quantity} onChange={(e) => updateIng(row.key, { quantity: e.target.value })} />
                <input aria-label="Unit" maxLength={50} placeholder="Unit (cups, g…)" value={row.unit} onChange={(e) => updateIng(row.key, { unit: e.target.value })} />
                <input aria-label="Ingredient name" maxLength={100} placeholder="Ingredient" value={row.name} onChange={(e) => updateIng(row.key, { name: e.target.value })} />
                <div className="row-card__tags">
                  <TagInput value={row.tags} onChange={(t) => updateIng(row.key, { tags: t })} placeholder="Ingredient tags (optional)" suggest={false} />
                </div>
                <div className="row-card__tags">
                  <input aria-label="Ingredient image URL" type="url" maxLength={2048} placeholder="Ingredient image URL (optional, used if it has none yet)" value={row.imageUrl} onChange={(e) => updateIng(row.key, { imageUrl: e.target.value })} />
                </div>
              </div>
              <div className="row-card__actions">
                <button type="button" className="icon-btn" aria-label="Move up" onClick={() => setIngredients((r) => move(r, i, i - 1))}>↑</button>
                <button type="button" className="icon-btn" aria-label="Move down" onClick={() => setIngredients((r) => move(r, i, i + 1))}>↓</button>
                <button type="button" className="icon-btn icon-btn--danger" aria-label="Remove ingredient" onClick={() => setIngredients((r) => r.filter((x) => x.key !== row.key))}>×</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn--pill" disabled={ingredients.length >= 100} onClick={() => setIngredients((r) => [...r, blankIngredient()])}>
          + Add ingredient
        </button>
      </section>

      <section className="form-section">
        <h2 className="section-title">Method</h2>
        <div className="rows">
          {steps.map((row, i) => (
            <div className="row-card" key={row.key}>
              <span className="step-label">Step {i + 1}</span>
              <div className="row-card__fields">
                <textarea aria-label={`Step ${i + 1}`} rows={2} maxLength={2000} placeholder="Describe this step…" value={row.text} onChange={(e) => updateStep(row.key, e.target.value)} />
              </div>
              <div className="row-card__actions">
                <button type="button" className="icon-btn" aria-label="Move up" onClick={() => setSteps((r) => move(r, i, i - 1))}>↑</button>
                <button type="button" className="icon-btn" aria-label="Move down" onClick={() => setSteps((r) => move(r, i, i + 1))}>↓</button>
                <button type="button" className="icon-btn icon-btn--danger" aria-label="Remove step" onClick={() => setSteps((r) => r.filter((x) => x.key !== row.key))}>×</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn--pill" disabled={steps.length >= 100} onClick={() => setSteps((r) => [...r, { key: nextKey(), text: '' }])}>
          + Add step
        </button>
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
