'use client';

type DevWorkbenchCheckboxFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

export default function DevWorkbenchCheckboxField({
  checked,
  onChange,
  label,
}: DevWorkbenchCheckboxFieldProps) {
  return (
    <label
      className="flex cursor-pointer items-center gap-2 text-sm text-foreground/80"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-border-color"
      />
      {label}
    </label>
  );
}
