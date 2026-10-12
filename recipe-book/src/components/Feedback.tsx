import type { ReactNode } from 'react';

export function Spinner({ full = false, label = 'Loading' }: { full?: boolean; label?: string }) {
  return (
    <div className={full ? 'spinner-wrap spinner-wrap--full' : 'spinner-wrap'} role="status" aria-label={label}>
      <span className="spinner" />
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <h3 className="display">{title}</h3>
      {children && <div className="muted">{children}</div>}
    </div>
  );
}

export function BracketTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="bracket-title">
      <span className="bracket bracket--tl" aria-hidden />
      <h1>{children}</h1>
      <span className="bracket bracket--br" aria-hidden />
      {sub && <p className="bracket-title__sub">{sub}</p>}
    </div>
  );
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.';
}
