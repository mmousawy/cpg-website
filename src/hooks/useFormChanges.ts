import { useMemo, useEffect, useContext } from 'react';
import { createContext } from 'react';

// Declare Window interface extension for unsaved changes context
declare global {
  interface Window {
    __unsavedChangesContext?: {
      setHasUnsavedChanges: (value: boolean) => void;
    };
  }
}

// Import the context type - we'll check if context exists at runtime
// This is a lightweight way to get the setter without a hard dependency
const UnsavedChangesContext = createContext<{ setHasUnsavedChanges?: (value: boolean) => void } | null>(null);

/**
 * Compare two values for equality (handles objects/arrays via JSON.stringify)
 */
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'object' && a !== null && b !== null) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/**
 * Normalize rich text for comparison. Treats empty/whitespace-only HTML (e.g. Quill's "<p><br></p>")
 * as equal to "" so we don't report false "unsaved changes" when the editor normalizes on mount.
 */
function normalizeRichTextForCompare(val: unknown): string {
  if (val == null) return '';
  const s = String(val).trim();
  if (!s) return '';
  const stripped = s.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
  if (!stripped) return '';
  return s.trim();
}

function isRichTextEqual(a: unknown, b: unknown): boolean {
  return normalizeRichTextForCompare(a) === normalizeRichTextForCompare(b);
}

interface UseFormChangesOptions {
  /** Whether to show a browser warning when leaving with unsaved changes (default: true) */
  warnOnLeave?: boolean;
  /** Keys whose values are rich text (Quill/HTML) - use normalized comparison to avoid false changes */
  richTextFields?: string[];
  /** When true, sync false to context (e.g. after successful submit) and don't overwrite with hasChanges */
  skipSync?: boolean;
}

/**
 * Hook to track form changes by comparing current values with saved baseline.
 * Also handles browser beforeunload warning and syncs with UnsavedChangesContext
 * for internal navigation warnings.
 *
 * @param currentValues - Current form values (e.g., from react-hook-form's watch())
 * @param savedValues - Saved/initial values to compare against
 * @param options - Configuration options
 * @param extraChanges - Additional boolean flags to include (e.g., pending avatar changes)
 * @returns Object with hasChanges boolean and changeCount number
 *
 * @example
 * const currentValues = watch()
 * const { hasChanges, changeCount } = useFormChanges(currentValues, savedFormValues, {}, hasAvatarChanges)
 */
export function useFormChanges<T extends Record<string, unknown>>(
  currentValues: T,
  savedValues: T | null,
  options: UseFormChangesOptions = {},
  ...extraChanges: boolean[]
): { hasChanges: boolean; changeCount: number } {
  const { warnOnLeave = true, richTextFields = [], skipSync = false } = options;

  const richTextFieldsKey = richTextFields.join(',');
  const richTextSet = useMemo(
    () => new Set(richTextFields),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- richTextFieldsKey captures richTextFields
    [richTextFieldsKey],
  );

  const extraChangesKey = extraChanges.join(',');

  const result = useMemo(() => {
    if (savedValues === null) {
      return { hasChanges: false, changeCount: 0 };
    }

    let changeCount = 0;
    const allKeys = new Set([...Object.keys(currentValues), ...Object.keys(savedValues)]);

    for (const key of allKeys) {
      const eq = richTextSet.has(key)
        ? isRichTextEqual(currentValues[key], savedValues[key])
        : isEqual(currentValues[key], savedValues[key]);
      if (!eq) changeCount++;
    }

    // Add extra change flags
    const extraChangeCount = extraChanges.filter(Boolean).length;
    changeCount += extraChangeCount;

    return { hasChanges: changeCount > 0, changeCount };
  }, [currentValues, savedValues, extraChangesKey, richTextSet]);

  // Sync with global UnsavedChangesContext for internal navigation warnings
  // We import dynamically to avoid circular dependencies
  useEffect(() => {
    let setHasUnsavedChanges: ((value: boolean) => void) | undefined;

    if (typeof window !== 'undefined' && window.__unsavedChangesContext) {
      setHasUnsavedChanges = window.__unsavedChangesContext.setHasUnsavedChanges;
    }

    if (setHasUnsavedChanges) {
      setHasUnsavedChanges(skipSync ? false : result.hasChanges);
    }

    return () => {
      if (setHasUnsavedChanges) {
        setHasUnsavedChanges(false);
      }
    };
  }, [result.hasChanges, skipSync]);

  return result;
}
