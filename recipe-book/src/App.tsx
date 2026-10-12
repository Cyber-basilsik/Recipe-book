import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { EmptyState } from './components/Feedback';
import { AdminRoute, ProtectedRoute } from './components/Guards';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { ContentsPage } from './pages/ContentsPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MealEditorPage } from './pages/MealEditorPage';
import { MealPage } from './pages/MealPage';
import { MealsPage } from './pages/MealsPage';
import { MenuPage } from './pages/MenuPage';
import { RecipeEditorPage } from './pages/RecipeEditorPage';
import { RecipePage } from './pages/RecipePage';
import { WelcomePage } from './pages/WelcomePage';

function Shell() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

/** Old /meals links: the same path and query under /meal-plans. */
function MealsRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate to={pathname.replace(/^\/meals/, '/meal-plans') + search} replace />;
}

function NotFound() {
  return (
    <div className="container page">
      <EmptyState title="Page not found">
        <Link to="/recipes" className="btn btn--primary">Back to recipes</Link>
      </EmptyState>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route index element={<WelcomePage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="contents" element={<ContentsPage />} />
            <Route path="recipes" element={<HomePage />} />
            <Route path="recipes/new" element={<RecipeEditorPage key="new" />} />
            <Route path="recipes/:id" element={<RecipePage />} />
            <Route path="recipes/:id/edit" element={<RecipeEditorPage key="edit" />} />
            <Route path="meal-plans" element={<MealsPage />} />
            <Route path="meal-plans/new" element={<MealEditorPage key="new" />} />
            <Route path="meal-plans/:id" element={<MealPage />} />
            <Route path="meal-plans/:id/edit" element={<MealEditorPage key="edit" />} />
            <Route path="meals/*" element={<MealsRedirect />} />
            <Route path="account" element={<AccountPage />} />
            <Route element={<AdminRoute />}>
              <Route path="admin" element={<AdminPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
