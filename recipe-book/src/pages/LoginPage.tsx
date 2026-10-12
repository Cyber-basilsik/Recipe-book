import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BracketTitle, ErrorBanner, errorMessage } from '../components/Feedback';
import { photos } from '../components/images';

type Mode = 'login' | 'register';

export function LoginPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'register') {
      if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username)) {
        setError('Username must be 3–32 characters: letters, numbers, _ . -');
        return;
      }
      if (password.length < 10) {
        setError('Password must be at least 10 characters.');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match.');
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === 'login') await login(username.trim(), password);
      else await register({ username: username.trim(), password, email: email.trim() || null });
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="login-page" style={{ ['--login-bg' as string]: `url(${photos.dinner})` }}>
      <div className="login-page__art">
        <div className="login-page__art-inner">
          <p className="eyebrow">Delicious recipes · shared kitchen</p>
          <BracketTitle sub="“Every dish tells a story — cook it, rate it, share it.”">
            Recipe
            <br />
            Book
          </BracketTitle>
          <ul className="login-page__contents">
            {['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Drinks'].map((c, i) => (
              <li key={c}>
                <span className="num-dot">{String(i + 1).padStart(2, '0')}</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="login-page__panel">
        <div className="login-card">
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => switchMode('login')}>
              Sign in
            </button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'is-active' : ''} onClick={() => switchMode('register')}>
              Register
            </button>
          </div>

          <h2 className="login-card__title">{mode === 'login' ? 'Welcome back' : 'Create an account'}</h2>
          <span className="highlight-bar">{mode === 'login' ? 'Enjoy' : 'Join the kitchen'}</span>

          {error && <ErrorBanner message={error} />}

          <form onSubmit={handleSubmit} className="stack">
            <div className="field">
              <label className="field__label" htmlFor="username">Username</label>
              <input id="username" autoComplete="username" required maxLength={64} value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            {mode === 'register' && (
              <div className="field">
                <label className="field__label" htmlFor="email">Email <span className="muted">(optional)</span></label>
                <input id="email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label className="field__label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={mode === 'register' ? 10 : 1}
                maxLength={256}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === 'register' && <span className="field__hint">At least 10 characters.</span>}
            </div>
            {mode === 'register' && (
              <div className="field">
                <label className="field__label" htmlFor="confirm">Confirm password</label>
                <input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
            )}
            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="muted small login-card__switch">
            {mode === 'login' ? (
              <>New here? <button type="button" className="link-btn" onClick={() => switchMode('register')}>Create an account</button></>
            ) : (
              <>Already have an account? <button type="button" className="link-btn" onClick={() => switchMode('login')}>Sign in</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
