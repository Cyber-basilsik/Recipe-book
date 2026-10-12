import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { mealsApi } from '../api/meals';
import type { Meal } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorBanner, Spinner, errorMessage } from '../components/Feedback';
import { MealForm } from '../components/MealForm';

export function MealEditorPage() {
  const { id } = useParams();
  const editing = id !== undefined;
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    mealsApi
      .get(Number(id))
      .then(setMeal)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [editing, id]);

  if (loading) return <Spinner full />;
  if (editing && error) return <div className="container page"><ErrorBanner message={error} /></div>;
  const isOwner = meal?.owner_sub === user?.id;
  if (editing && meal && !(isAdmin || isOwner))
    return (
      <div className="container page">
        <EmptyState title="Not your meal plan">
          Only the owner or an admin can edit this. <Link to={`/meal-plans/${meal.id}`}>Back to the meal plan</Link>
        </EmptyState>
      </div>
    );

  return (
    <div className="container page page--narrow">
      <p className="eyebrow">{editing ? 'Edit meal plan' : 'New meal plan'}</p>
      <h1 className="page-title">{editing ? meal?.title : 'Build a meal plan'}</h1>
      <span className="underline-bar" aria-hidden />
      {!editing && <p className="muted">New meal plans are private. You can ask for one to be published from its page.</p>}
      {isOwner && meal && meal.visibility !== 'PRIVATE' && (
        <p className="notice" role="note">
          This meal plan is {meal.visibility === 'PUBLIC' ? 'public' : 'waiting for review'}. Saving changes sends it back to an admin for review.
        </p>
      )}
      <MealForm
        initial={meal ?? undefined}
        submitLabel={editing ? 'Save changes' : 'Create meal plan'}
        onCancel={() => navigate(editing ? `/meal-plans/${id}` : '/meal-plans')}
        onSubmit={async (data) => {
          const saved = editing ? await mealsApi.update(Number(id), data) : await mealsApi.create(data);
          navigate(`/meal-plans/${saved.id}`, { replace: true });
        }}
      />
    </div>
  );
}
