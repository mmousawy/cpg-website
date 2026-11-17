const SHEET_ROOT_ATTR = 'data-bottom-sheet';

const SUSPEND_EVENT = 'cpg-bottom-sheet-suspend';
const RESUME_EVENT = 'cpg-bottom-sheet-resume';

let pointerInsideSheet = false;
let sheetSuspendedForModal = false;
let clearPointerTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Remember whether this gesture started inside an open bottom sheet.
 * Cleared after the click that follows pointerdown, so a later modal open
 * does not inherit it.
 */
export function noteSheetPointerDown(target: EventTarget | null) {
  pointerInsideSheet = target instanceof Element
    && target.closest(`[${SHEET_ROOT_ATTR}]`) != null;
  if (clearPointerTimer !== undefined) clearTimeout(clearPointerTimer);
  clearPointerTimer = setTimeout(() => {
    pointerInsideSheet = false;
    clearPointerTimer = undefined;
  }, 0);
}

export function sheetModalReturnRootAttr(): string {
  return SHEET_ROOT_ATTR;
}

/**
 * Hide the open sheet while a modal opened from it is showing.
 * The sheet stays mounted so its form state is still there on the way back.
 */
export function suspendSheetForModalIfOpenedFromSheet() {
  const active = document.activeElement;
  const fromFocus = active instanceof Element
    && active.closest(`[${SHEET_ROOT_ATTR}]`) != null;
  if (!pointerInsideSheet && !fromFocus) return;
  pointerInsideSheet = false;
  sheetSuspendedForModal = true;
  document.dispatchEvent(new Event(SUSPEND_EVENT));
}

/** Show the sheet again after that modal closes. */
export function resumeSheetAfterModal() {
  if (!sheetSuspendedForModal) return;
  sheetSuspendedForModal = false;
  document.dispatchEvent(new Event(RESUME_EVENT));
}

export function subscribeSheetModalSuspension(onChange: (suspended: boolean) => void) {
  const onSuspend = () => onChange(true);
  const onResume = () => onChange(false);
  document.addEventListener(SUSPEND_EVENT, onSuspend);
  document.addEventListener(RESUME_EVENT, onResume);
  return () => {
    document.removeEventListener(SUSPEND_EVENT, onSuspend);
    document.removeEventListener(RESUME_EVENT, onResume);
  };
}
