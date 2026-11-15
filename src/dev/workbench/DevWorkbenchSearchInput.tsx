'use client';

type DevWorkbenchSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
};

export default function DevWorkbenchSearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  label = 'Search',
}: DevWorkbenchSearchInputProps) {
  return (
    <label
      className="block"
    >
      <span
        className="sr-only"
      >
        {label}
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border-color bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}
