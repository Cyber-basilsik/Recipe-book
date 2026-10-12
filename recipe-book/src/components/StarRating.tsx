import { useState } from 'react';

interface Props {
  value: number | null;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  count?: number;
}

export function StarRating({ value, onChange, size = 'md', count }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const interactive = !!onChange;

  return (
    <span className={`stars stars--${size}`} onMouseLeave={() => setHover(null)}>
      <span
        className="stars__row"
        role={interactive ? 'radiogroup' : 'img'}
        aria-label={interactive ? 'Your rating' : value ? `Rated ${value.toFixed(1)} of 5` : 'Not rated'}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const fill = Math.max(0, Math.min(1, shown - (n - 1)));
          const star = (
            <span className="star" style={{ ['--fill' as string]: `${fill * 100}%` }} aria-hidden>
              ★
            </span>
          );
          return interactive ? (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              className="star-btn"
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onBlur={() => setHover(null)}
              onClick={() => onChange(n)}
            >
              {star}
            </button>
          ) : (
            <span key={n}>{star}</span>
          );
        })}
      </span>
      {count !== undefined && <span className="stars__count">({count})</span>}
    </span>
  );
}
