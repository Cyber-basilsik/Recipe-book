import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Header() {
  const { user, isAdmin, logout } = useAuth();
  const [userOpen, setUserOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const close = () => setUserOpen(false);
  const handleLogout = async () => {
    close();
    await logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (!userOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) setUserOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [userOpen]);

  return (
    <header className="site-header">
      <div className="site-header__inner container">
        <NavLink to="/menu" className="toolbar-pill toolbar-pill--start" onClick={close}>
          <svg className="toolbar-pill__icon" viewBox="0 0 20 10" fill="none" aria-hidden>
            <path d="M1 3c3-2.5 5 2.5 9 0s6-2.5 9 0" />
            <path d="M1 8c3-2.5 5 2.5 9 0s6-2.5 9 0" />
          </svg>
          Menu
        </NavLink>

        <Link to="/" className="logo" onClick={close}>
          <span className="logo__mark" aria-hidden />
          <span className="logo__text">
            Recipe<span>Book</span>
          </span>
        </Link>

        <div className="user-menu" ref={userMenuRef}>
          <button
            type="button"
            className="toolbar-pill user-menu__toggle"
            aria-haspopup="menu"
            aria-expanded={userOpen}
            aria-controls="user-menu"
            aria-label={`Account menu for ${user?.username ?? ''}`}
            onClick={() => setUserOpen((o) => !o)}
          >
            <span className="avatar avatar--sm" aria-hidden>
              {user?.username.slice(0, 1).toUpperCase()}
            </span>
            <span className="site-nav__name">{user?.username}</span>
            <span className="user-menu__caret" aria-hidden />
          </button>
          {userOpen && (
            <div id="user-menu" className="user-menu__panel" role="menu">
              <NavLink to="/account" role="menuitem" onClick={close}>
                Account
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin" role="menuitem" onClick={close}>
                  Admin
                </NavLink>
              )}
              <button type="button" role="menuitem" onClick={handleLogout}>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
