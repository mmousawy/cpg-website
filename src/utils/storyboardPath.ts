export {
  DEV_WORKBENCH_PAGE_BOOT_SCRIPT,
  DEV_WORKBENCH_PAGE_CLASS,
  isDevWorkbenchPath,
  isEmailPreviewWorkbenchPath,
  isStoryboardPath,
} from './devWorkbenchPath';

/** @deprecated Use `DEV_WORKBENCH_PAGE_BOOT_SCRIPT` */
export const STORYBOARD_PAGE_BOOT_SCRIPT = '(function(){var p=location.pathname;if(p==="/dev/ui"||p.indexOf("/dev/ui/")===0){document.documentElement.classList.add("dev-workbench-page");}})();';
