export { };

declare global {
  interface Window {
    __unsavedChangesContext?: {
      setHasUnsavedChanges: (value: boolean) => void;
      hasUnsavedChanges: () => boolean;
    };
  }
}
