import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { recipesApi } from '../api/recipes';
import type { Recipe } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorBanner, Spinner, errorMessage } from '../components/Feedback';
import { RecipeForm } from '../components/RecipeForm';

export function RecipeEditorPage() {
  const { id } = useParams();
  const editing = id !== undefined;
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    recipesApi
      .get(Number(id))
      .then(setRecipe)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [editing, id]);

  if (loading) return <Spinner full />;
  if (editing && error) return <div className="container page"><ErrorBanner message={error} /></div>;
  if (editing && recipe && !(isAdmin || recipe.owner_sub === user?.id))
    return (
      <div className="container page">
        <EmptyState title="Not your recipe">
          Only the owner or an admin can edit this. <Link to={`/recipes/${recipe.id}`}>Back to recipe</Link>
        </EmptyState>
      </div>
    );

  return (
    <div className="container page page--narrow">
      <p className="eyebrow">{editing ? 'Edit recipe' : 'New recipe'}</p>
      <h1 className="page-title">{editing ? recipe?.title : 'Add a recipe'}</h1>
      <span className="underline-bar" aria-hidden />
      <RecipeForm
        initial={recipe ?? undefined}
        submitLabel={editing ? 'Save changes' : 'Publish recipe'}
        onCancel={() => navigate(editing ? `/recipes/${id}` : '/recipes')}
        onSubmit={async (data) => {
          const saved = editing ? await recipesApi.update(Number(id), data) : await recipesApi.create(data);
          navigate(`/recipes/${saved.id}`, { replace: true });
        }}
      />
    </div>
  );
}
