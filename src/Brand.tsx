import { Heart, Leaf } from 'lucide-react';
export type Theme = 'rose' | 'sage';

export function Emblem() {
  return (
    <span className="emblem" aria-hidden="true">
      <img src="/brand-bear.svg" width={43} height={43} alt="" draggable={false} />
    </span>
  );
}

export function ThemeSwitch({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  return (
    <div className="theme-switch" role="group" aria-label="Choose your color theme">
      <button type="button" aria-label="Pink romance theme" aria-pressed={theme === 'rose'}
        title="Pink romance" className={theme === 'rose' ? 'active' : ''}
        onClick={() => onChange('rose')}>
        <Heart size={15} fill={theme === 'rose' ? 'currentColor' : 'none'} /> <span>Pink</span>
      </button>
      <button type="button" aria-label="Sage green theme" aria-pressed={theme === 'sage'}
        title="Sage green" className={theme === 'sage' ? 'active' : ''}
        onClick={() => onChange('sage')}>
        <Leaf size={15} /> <span>Sage</span>
      </button>
    </div>
  );
}
