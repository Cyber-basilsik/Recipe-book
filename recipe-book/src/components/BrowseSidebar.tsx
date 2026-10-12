import { useId, useState } from 'react';
import type { Category, MealType, TagCount } from '../api/types';
import { CATEGORIES, MEAL_TYPES, categoryInfo, mealTypeInfo } from './categories';
import { photos } from './images';

export type Scope = 'all' | 'mine' | 'saved';

interface Props {
  category: Category | null;
  mealType: MealType | null;
  counts: Partial<Record<Category | 'ALL', number>>;
  tags: TagCount[];
  tagsLoading: boolean;
  tag: string | null;
  scope: Scope;
  onCategory: (category: Category | null) => void;
  onMealType: (mealType: MealType | null) => void;
  onTag: (tag: string | null) => void;
  onScope: (scope: Scope) => void;
  onClear: () => void;
}

const OPEN_KEY = 'rb.filtersOpen';
const SCOPE_LABEL: Record<Scope, string> = { all: 'All', mine: 'Mine', saved: 'Saved' };

function readOpen() {
  try {
    return localStorage.getItem(OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

/** The recipe browser's sidebar: meal time, categories, scope and tags. Collapses behind the Filters button on narrow screens. */
export function BrowseSidebar({ category, mealType, counts, tags, tagsLoading, tag, scope, onCategory, onMealType, onTag, onScope, onClear }: Props) {
  const [open, setOpen] = useState(readOpen);
  const [tagQuery, setTagQuery] = useState('');
  const panelId = useId();

  const toggle = () => {
    setOpen((o) => {
      try {
        localStorage.setItem(OPEN_KEY, o ? '0' : '1');
      } catch {
        /* storage unavailable */
      }
      return !o;
    });
  };

  const filterCount = (tag ? 1 : 0) + (scope !== 'all' ? 1 : 0) + (mealType ? 1 : 0);
  const activeCount = filterCount + (category ? 1 : 0);
  const activeCategory = category ? categoryInfo(category) : undefined;
  const activeMealType = mealTypeInfo(mealType);
  const needle = tagQuery.trim().toLowerCase();
  const shownTags = tags.filter((t) => (t.recipes > 0 || t.tag === tag) && (!needle || t.tag.includes(needle)));
  const rows = [
    { value: null, label: 'All', photo: photos.dinner, count: counts.ALL },
    ...CATEGORIES.map((c) => ({ value: c.value, label: c.plural, photo: c.photo, count: counts[c.value] })),
  ];

  return (
    <aside className="home-sidebar" aria-label="Browse and filter">
      <div className="filter-bar__row">
        <button
          type="button"
          className={`filter-toggle ${open ? 'is-open' : ''}`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M3 5h18l-7 8v6l-4 2v-8z" />
          </svg>
          Filters
          {activeCount > 0 && <span className="filter-toggle__badge">{activeCount}</span>}
          <span className="filter-toggle__caret" aria-hidden>▾</span>
        </button>

        {activeCount > 0 && (
          <ul className="active-filters" aria-label="Active filters">
            {activeCategory && (
              <li>
                <button type="button" className="chip chip--active-filter" onClick={() => onCategory(null)} aria-label={`Remove ${activeCategory.plural} category`}>
                  {activeCategory.plural} <span aria-hidden>×</span>
                </button>
              </li>
            )}
            {activeMealType && (
              <li>
                <button type="button" className="chip chip--active-filter" onClick={() => onMealType(null)} aria-label={`Remove ${activeMealType.label} meal time`}>
                  {activeMealType.plural} <span aria-hidden>×</span>
                </button>
              </li>
            )}
            {scope !== 'all' && (
              <li>
                <button type="button" className="chip chip--active-filter" onClick={() => onScope('all')} aria-label={`Remove ${SCOPE_LABEL[scope]} filter`}>
                  {SCOPE_LABEL[scope]} <span aria-hidden>×</span>
                </button>
              </li>
            )}
            {tag && (
              <li>
                <button type="button" className="chip chip--active-filter" onClick={() => onTag(null)} aria-label={`Remove tag ${tag}`}>
                  #{tag} <span aria-hidden>×</span>
                </button>
              </li>
            )}
            {filterCount > 0 && (
              <li>
                <button type="button" className="link-btn small" onClick={onClear}>
                  Clear all
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      <div id={panelId} className={`home-sidebar__body ${open ? 'is-open' : ''}`}>
        <div className="home-sidebar__group">
          <span className="field__label">Meal time</span>
          <div className="chip-row" role="group" aria-label="Filter by meal time">
            <button type="button" className={`chip ${!mealType ? 'is-active' : ''}`} aria-pressed={!mealType} onClick={() => onMealType(null)}>
              Any
            </button>
            {MEAL_TYPES.map((t) => (
              <button key={t.value} type="button" className={`chip ${mealType === t.value ? 'is-active' : ''}`} aria-pressed={mealType === t.value} onClick={() => onMealType(mealType === t.value ? null : t.value)}>
                {t.plural}
              </button>
            ))}
          </div>
        </div>

        <div className="home-sidebar__group">
          <span className="field__label">Categories</span>
          <div className="sidebar-cats" role="group" aria-label="Recipe categories">
            {rows.map((r) => {
              const isActive = category === r.value;
              return (
                <button
                  key={r.label}
                  type="button"
                  className={`sidebar-cat ${isActive ? 'is-active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => onCategory(r.value)}
                >
                  <span className="sidebar-cat__photo" style={{ backgroundImage: `url(${r.photo})` }} aria-hidden />
                  <span className="sidebar-cat__label">{r.label}</span>
                  <span className="sidebar-cat__count">{r.count === undefined ? '…' : r.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="home-sidebar__group">
          <span className="field__label">Show</span>
          <div className="segmented" role="group" aria-label="Which recipes">
            {(['all', 'mine', 'saved'] as Scope[]).map((s) => (
              <button key={s} type="button" className={scope === s ? 'is-active' : ''} aria-pressed={scope === s} onClick={() => onScope(s)}>
                {SCOPE_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="home-sidebar__group">
          <div className="home-sidebar__tags-head">
            <span className="field__label">Tags</span>
            <input
              type="search"
              className="home-sidebar__tag-search"
              placeholder="Find a tag…"
              aria-label="Find a tag"
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
            />
          </div>
          <div className="home-sidebar__tags" role="group" aria-label="Filter by tag">
            {tagsLoading && <span className="muted small">Loading tags…</span>}
            {!tagsLoading && shownTags.length === 0 && <span className="muted small">No matching tags.</span>}
            {shownTags.map((t) => (
              <button
                key={t.tag}
                type="button"
                className={`chip ${tag === t.tag ? 'is-active' : ''}`}
                aria-pressed={tag === t.tag}
                onClick={() => onTag(tag === t.tag ? null : t.tag)}
              >
                {t.tag}
                <span className="chip__count">{t.recipes}</span>
              </button>
            ))}
          </div>
        </div>

        {filterCount > 0 && (
          <button type="button" className="link-btn small home-sidebar__clear" onClick={onClear}>
            Clear filters
          </button>
        )}
      </div>
    </aside>
  );
}
