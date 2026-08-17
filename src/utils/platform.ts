/**
 * Runs in the document head before paint so keyboard shortcut labels can
 * match the OS without waiting for hydration (⌘ vs Ctrl).
 */
export const PLATFORM_BOOT_SCRIPT =
  '(function(){try{var p=navigator.platform||"";if(/Mac|iPhone|iPod|iPad/.test(p))document.documentElement.dataset.platform="mac"}catch(e){}})();';
