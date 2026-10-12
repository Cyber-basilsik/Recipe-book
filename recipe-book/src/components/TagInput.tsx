import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { recipesApi } from '../api/recipes';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  suggest?: boolean;
  max?: number;
}

const normalize = (t: string) => t.trim().toLowerCase().slice(0, 50);

export function TagInput({ value, onChange, label, placeholder = 'Add a tag…', suggest = true, max = 20 }: Props) {
  const [draft, setDraft] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const id = useId();

  useEffect(() => {
    if (!suggest || !draft.trim()) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      recipesApi
        .tags(draft.trim())
        .then((res) => setSuggestions(res.items.map((t) => t.tag).filter((t) => !value.includes(t)).slice(0, 6)))
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [draft, suggest, value]);

  const add = (raw: string) => {
    const parts = raw.split(',').map(normalize).filter(Boolean);
    const next = [...value];
    for (const p of parts) if (!next.includes(p) && next.length < max) next.push(p);
    onChange(next);
    setDraft('');
    setSuggestions([]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && draft.trim()) {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="tag-input">
      {label && (
        <label htmlFor={id} className="field__label">
          {label}
        </label>
      )}
      <div className="tag-input__box">
        {value.map((t) => (
          <span key={t} className="chip chip--static">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          placeholder={value.length >= max ? '' : placeholder}
          disabled={value.length >= max}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && add(draft)}
        />
      </div>
      {suggestions.length > 0 && (
        <div className="tag-input__suggest">
          {suggestions.map((s) => (
            <button key={s} type="button" className="chip chip--sm" onMouseDown={(e) => e.preventDefault()} onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
