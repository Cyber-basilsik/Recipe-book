import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import { ErrorBanner, errorMessage } from '../components/Feedback';

function fmt(iso?: string | null) {
  return iso ? new Date(iso).toLocaleString() : '—';
}

export function AccountPage() {
  const { user, endSession } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 10) return setError('New password must be at least 10 characters.');
    if (next !== confirm) return setError('New passwords do not match.');
    setBusy(true);
    try {
      await authApi.changePassword({ current_password: current, new_password: next });
      // The server revokes every refresh token, so start a fresh session.
      endSession();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="container page page--narrow">
      <p className="eyebrow">Your account</p>
      <h1 className="page-title">{user.username}</h1>
      <span className="underline-bar" aria-hidden />

      <section className="nutrition">
        <table className="spec-table">
          <thead>
            <tr><th>Item</th><th>Detail</th></tr>
          </thead>
          <tbody>
            <tr><td>Username</td><td>{user.username}</td></tr>
            <tr><td>Email</td><td>{user.email || '—'}</td></tr>
            <tr><td>Roles</td><td>{user.roles.join(', ') || '—'}</td></tr>
            <tr><td>Status</td><td>{user.is_active ? 'Active' : 'Disabled'}</td></tr>
            <tr><td>Member since</td><td>{fmt(user.created_at)}</td></tr>
            <tr><td>Last sign-in</td><td>{fmt(user.last_login_at)}</td></tr>
            <tr><td>User ID</td><td className="mono">{user.id}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2 className="section-title">Change password</h2>
        <p className="muted small">You'll be signed out on every device and asked to sign in again.</p>
        {error && <ErrorBanner message={error} />}
        <form onSubmit={handleSubmit} className="stack">
          <div className="field">
            <label className="field__label" htmlFor="cur">Current password</label>
            <input id="cur" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="new">New password</label>
            <input id="new" type="password" autoComplete="new-password" required minLength={10} maxLength={256} value={next} onChange={(e) => setNext(e.target.value)} />
            <span className="field__hint">At least 10 characters.</span>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="conf">Confirm new password</label>
            <input id="conf" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <div>
            <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
