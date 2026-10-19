import { useEffect } from 'react';

/**
 * Scrolls the window back to the top whenever `key` changes, so a new step or activity
 * opens at its beginning instead of where the previous "Next" button was.
 */
export const useScrollToTopOnChange = (key: unknown) => {
  useEffect(() => {
    // 'instant' overrides the global `scroll-behavior: smooth`, which step transitions would interrupt.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [key]);
};
