export const createDebouncedTask = (callback: () => Promise<void>, delay: number) => {
  let timeoutId: number | null = null;

  return {
    trigger() {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        void callback();
      }, delay);
    },
    flush() {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }

      return callback();
    },
  };
};
