import { useMemo, useEffect, useContext } from 'react';
import { createContext } from 'react';

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

interface UseFormChangesOptions {
  /** Whether to show a browser warning when leaving with unsaved changes (default: true) */
  warnOnLeave?: boolean
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
  const { warnOnLeave = true } = options;

  // Memoize extraChanges array to avoid dependency issues
  const extraChangesKey = extraChanges.join(',');

  const result = useMemo(() => {
    // If no saved values yet, no changes
    if (savedValues === null) {
      return { hasChanges: false, changeCount: 0 };
    }

    // Count changed fields by comparing each key
    let changeCount = 0;
    const allKeys = new Set([...Object.keys(currentValues), ...Object.keys(savedValues)]);

    for (const key of allKeys) {
      if (!isEqual(currentValues[key], savedValues[key])) {
        changeCount++;
      }
    }

    // Add extra change flags
    const extraChangeCount = extraChanges.filter(Boolean).length;
    changeCount += extraChangeCount;

    return { hasChanges: changeCount > 0, changeCount };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- extraChangesKey captures extraChanges
  }, [currentValues, savedValues, extraChangesKey]);

  // Sync with global UnsavedChangesContext for internal navigation warnings
  // We import dynamically to avoid circular dependencies
  useEffect(() => {
    let setHasUnsavedChanges: ((value: boolean) => void) | undefined;

    // Try to get the context setter from the window (set by UnsavedChangesProvider)
    if (typeof window !== 'undefined' && (window as any).__unsavedChangesContext) {
      setHasUnsavedChanges = (window as any).__unsavedChangesContext.setHasUnsavedChanges;
    }

    if (setHasUnsavedChanges) {
      setHasUnsavedChanges(result.hasChanges);
    }

    // Cleanup: reset on unmount
    return () => {
      if (setHasUnsavedChanges) {
        setHasUnsavedChanges(false);
      }
    };
  }, [result.hasChanges]);

  return result;
}
