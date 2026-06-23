interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
}

export default function Toggle({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label
}: ToggleProps) {
  const sizes = {
    sm: { track: 'w-9 h-5', thumb: 'h-4 w-4', translate: 'translate-x-4' },
    md: { track: 'w-11 h-6', thumb: 'h-5 w-5', translate: 'translate-x-5' }
  };

  const s = sizes[size];

  return (
    <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        className="sr-only peer"
        disabled={disabled}
        aria-checked={checked}
      />
      <div
        className={`${s.track} rounded-full transition-colors relative`}
        style={{
          backgroundColor: checked ? 'var(--accent)' : 'var(--bg-tertiary)'
        }}
      >
        <div
          className={`${s.thumb} bg-white rounded-full shadow-sm transition-transform absolute top-[2px] ${
            checked ? s.translate : 'translate-x-[2px]'
          }`}
        />
      </div>
      {label && (
        <span className="ml-3 text-sm" style={{ color: 'var(--text-primary)' }}>
          {label}
        </span>
      )}
    </label>
  );
}
