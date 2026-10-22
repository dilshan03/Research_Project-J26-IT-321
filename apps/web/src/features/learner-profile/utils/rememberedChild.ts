/**
 * Remembers which child a parent last selected (per browser). Only the learner ID is stored,
 * never any learning or health data. Storage failures are ignored (selection still works).
 */
const SELECTED_CHILD_KEY = 'mathquest.parent.selectedLearnerId';

export const readRememberedChild = (): string | null => {
  try {
    return window.localStorage.getItem(SELECTED_CHILD_KEY);
  } catch {
    return null;
  }
};

export const rememberChild = (learnerId: string): void => {
  try {
    window.localStorage.setItem(SELECTED_CHILD_KEY, learnerId);
  } catch {
    // Storage unavailable (private mode etc.)
  }
};
