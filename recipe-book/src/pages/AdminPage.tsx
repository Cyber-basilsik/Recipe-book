import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { mealsApi } from '../api/meals';
import { recipesApi } from '../api/recipes';
import type { Ingredient, Meal, User } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { ErrorBanner, Spinner, errorMessage } from '../components/Feedback';
import { TagInput } from '../components/TagInput';

const PAGE = 25;

function Pager({ offset, total, onChange }: { offset: number; total: number; onChange: (o: number) => void }) {
  if (total <= PAGE) return null;
  return (
    <div className="pager">
      <button type="button" className="btn btn--pill btn--sm" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - PAGE))}>← Prev</button>
      <span className="muted small">{offset + 1}–{Math.min(offset + PAGE, total)} of {total}</span>
      <button type="button" className="btn btn--pill btn--sm" disabled={offset + PAGE >= total} onClick={() => onChange(offset + PAGE)}>Next →</button>
    </div>
  );
}

function UsersPanel() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    authApi
      .listUsers(PAGE, offset)
      .then((res) => {
        setUsers(res.items);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [offset]);
  useEffect(load, [load]);

  const save = async (u: User, patch: { roles?: string[]; is_active?: boolean }) => {
    setBusyId(u.id);
    setError(null);
    try {
      const updated = await authApi.updateUser(u.id, patch);
      setUsers((list) => list.map((x) => (x.id === u.id ? updated : x)));
      setDrafts((d) => {
        const { [u.id]: _, ...rest } = d;
        return rest;
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="panel">
      <h2 className="section-title">Users</h2>
      {error && <ErrorBanner message={error} onRetry={load} />}
      {loading ? (
        <Spinner />
      ) : (
        <div className="table-scroll">
          <table className="spec-table spec-table--admin">
            <thead>
              <tr><th>User</th><th>Roles</th><th>Active</th><th>Last sign-in</th><th /></tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const draft = drafts[u.id];
                const isSelf = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.username}</strong>
                      {isSelf && <span className="muted small"> (you)</span>}
                      <div className="muted small">{u.email || ''}</div>
                    </td>
                    <td className="td-tags">
                      <TagInput value={draft ?? u.roles} onChange={(r) => setDrafts((d) => ({ ...d, [u.id]: r }))} placeholder="role…" suggest={false} />
                    </td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={u.is_active} disabled={isSelf || busyId === u.id} onChange={(e) => save(u, { is_active: e.target.checked })} />
                        <span className="switch__track" aria-hidden />
                        <span className="sr-only">Active</span>
                      </label>
                    </td>
                    <td className="small">{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '—'}</td>
                    <td>
                      {draft && (
                        <button type="button" className="btn btn--primary btn--sm" disabled={busyId === u.id} onClick={() => save(u, { roles: draft })}>
                          Save roles
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager offset={offset} total={total} onChange={setOffset} />
    </section>
  );
}

interface IngredientDraft {
  tags?: string[];
  image_url?: string;
}

function IngredientsPanel() {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, IngredientDraft>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const editDraft = (id: number, patch: IngredientDraft) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const load = useCallback(() => {
    setLoading(true);
    recipesApi
      .ingredients({ limit: PAGE, offset, q: query || undefined })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [offset, query]);
  useEffect(load, [load]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setOffset(0);
    setQuery(q.trim());
  };

  const save = async (ing: Ingredient) => {
    const draft = drafts[ing.id];
    const url = draft.image_url?.trim();
    if (url && !/^https?:\/\/\S+$/.test(url)) {
      setError(`Image URL for "${ing.name}" must start with http:// or https://`);
      return;
    }
    setBusyId(ing.id);
    setError(null);
    try {
      // Only the drafted fields are sent; an emptied URL clears the image.
      const updated = await recipesApi.updateIngredient(ing.id, {
        ...(draft.tags ? { tags: draft.tags } : {}),
        ...(draft.image_url !== undefined ? { image_url: url || null } : {}),
      });
      setItems((list) => list.map((x) => (x.id === ing.id ? updated : x)));
      setDrafts((d) => {
        const { [ing.id]: _, ...rest } = d;
        return rest;
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="panel">
      <h2 className="section-title">Ingredients</h2>
      <form className="search search--inline" onSubmit={onSearch}>
        <label htmlFor="ing-q" className="sr-only">Search ingredients</label>
        <input id="ing-q" type="search" placeholder="Search ingredients…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" className="btn btn--pill btn--sm">Search</button>
      </form>
      {error && <ErrorBanner message={error} onRetry={load} />}
      {loading ? (
        <Spinner />
      ) : (
        <div className="table-scroll">
          <table className="spec-table spec-table--admin">
            <thead>
              <tr><th>Ingredient</th><th>Tags</th><th>Image URL</th><th /></tr>
            </thead>
            <tbody>
              {items.map((ing) => (
                <tr key={ing.id}>
                  <td>
                    <span className="ing-cell">
                      {ing.image_url ? <img className="ingredient-list__thumb" src={ing.image_url} alt="" /> : <span className="ingredient-list__thumb ingredient-list__thumb--blank" aria-hidden>{ing.name[0]?.toUpperCase()}</span>}
                      {ing.name}
                    </span>
                  </td>
                  <td className="td-tags">
                    <TagInput value={drafts[ing.id]?.tags ?? ing.tags} onChange={(t) => editDraft(ing.id, { tags: t })} />
                  </td>
                  <td className="td-url">
                    <input
                      aria-label={`Image URL for ${ing.name}`}
                      type="url"
                      maxLength={2048}
                      placeholder="https://…"
                      value={drafts[ing.id]?.image_url ?? ing.image_url ?? ''}
                      onChange={(e) => editDraft(ing.id, { image_url: e.target.value })}
                    />
                  </td>
                  <td>
                    {drafts[ing.id] && (
                      <button type="button" className="btn btn--primary btn--sm" disabled={busyId === ing.id} onClick={() => save(ing)}>
                        Save
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} className="muted">No ingredients found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <Pager offset={offset} total={total} onChange={setOffset} />
    </section>
  );
}

/** Meal plans waiting for review, and the public catalog with its featured switch. */
function MealsPanel() {
  const [pending, setPending] = useState<Meal[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingOffset, setPendingOffset] = useState(0);
  const [published, setPublished] = useState<Meal[]>([]);
  const [publishedTotal, setPublishedTotal] = useState(0);
  const [publishedOffset, setPublishedOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      mealsApi.list({ all: true, visibility: 'PENDING', limit: PAGE, offset: pendingOffset }),
      mealsApi.catalog({ limit: PAGE, offset: publishedOffset }),
    ])
      .then(([queue, catalog]) => {
        setPending(queue.items);
        setPendingTotal(queue.total);
        setPublished(catalog.items);
        setPublishedTotal(catalog.total);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [pendingOffset, publishedOffset]);
  useEffect(load, [load]);

  // Approving or rejecting moves a meal plan between lists, and featuring reorders the catalog, so refetch.
  const run = async (meal: Meal, action: () => Promise<Meal>) => {
    setBusyId(meal.id);
    setError(null);
    try {
      await action();
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const mealCell = (m: Meal) => (
    <td>
      <Link to={`/meal-plans/${m.id}`}><strong>{m.title}</strong></Link>
      <div className="muted small">
        Cook {m.owner_sub.slice(0, 6)} · {m.items.length} dish{m.items.length === 1 ? '' : 'es'}
      </div>
    </td>
  );

  return (
    <section className="panel">
      <h2 className="section-title">Meal plans</h2>
      {error && <ErrorBanner message={error} onRetry={load} />}
      {loading ? (
        <Spinner />
      ) : (
        <>
          <h3 className="field__label">Waiting for review ({pendingTotal})</h3>
          <div className="table-scroll">
            <table className="spec-table spec-table--admin">
              <thead>
                <tr><th>Meal plan</th><th>Note if rejected</th><th /></tr>
              </thead>
              <tbody>
                {pending.map((m) => (
                  <tr key={m.id}>
                    {mealCell(m)}
                    <td className="td-tags">
                      <input
                        aria-label={`Rejection note for ${m.title}`}
                        maxLength={2000}
                        placeholder="Shown to the owner, e.g. Add a photo"
                        value={notes[m.id] ?? ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [m.id]: e.target.value }))}
                      />
                    </td>
                    <td>
                      <span className="row-actions">
                        <button type="button" className="btn btn--primary btn--sm" disabled={busyId === m.id} onClick={() => run(m, () => mealsApi.approve(m.id))}>
                          Approve
                        </button>
                        <button type="button" className="btn btn--danger btn--sm" disabled={busyId === m.id} onClick={() => run(m, () => mealsApi.reject(m.id, notes[m.id]?.trim() || null))}>
                          Reject
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
                {pending.length === 0 && (
                  <tr><td colSpan={3} className="muted">Nothing is waiting for review.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager offset={pendingOffset} total={pendingTotal} onChange={setPendingOffset} />

          <h3 className="field__label admin-subhead">Public catalog ({publishedTotal})</h3>
          <div className="table-scroll">
            <table className="spec-table spec-table--admin">
              <thead>
                <tr><th>Meal plan</th><th>Published</th><th>Featured</th><th /></tr>
              </thead>
              <tbody>
                {published.map((m) => (
                  <tr key={m.id}>
                    {mealCell(m)}
                    <td className="small">{m.published_at ? new Date(m.published_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={m.is_featured} disabled={busyId === m.id} onChange={(e) => run(m, () => mealsApi.setFeatured(m.id, e.target.checked))} />
                        <span className="switch__track" aria-hidden />
                        <span className="sr-only">Featured</span>
                      </label>
                    </td>
                    <td>
                      <button type="button" className="btn btn--pill btn--sm" disabled={busyId === m.id} onClick={() => run(m, () => mealsApi.unpublish(m.id))}>
                        Unpublish
                      </button>
                    </td>
                  </tr>
                ))}
                {published.length === 0 && (
                  <tr><td colSpan={4} className="muted">No public meal plans yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager offset={publishedOffset} total={publishedTotal} onChange={setPublishedOffset} />
        </>
      )}
    </section>
  );
}

export function AdminPage() {
  return (
    <div className="container page">
      <p className="eyebrow">Administration</p>
      <h1 className="page-title">Kitchen control</h1>
      <span className="underline-bar" aria-hidden />
      <div className="admin-grid">
        <UsersPanel />
        <MealsPanel />
        <IngredientsPanel />
      </div>
    </div>
  );
}
