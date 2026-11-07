import { useRef } from 'react';

// Compare the draft with the values shown on mount, including defaults for new forms.
// Validation errors, open menus and other presentation state do not belong in values.
export function useFormChanges(values: unknown): boolean {
  const snapshot = JSON.stringify(values);
  const initial = useRef(snapshot);
  return snapshot !== initial.current;
}
