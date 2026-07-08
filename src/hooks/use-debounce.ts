import { useState, useEffect } from 'react';

/**
 * Custom debounce hook — delays updating the returned value until
 * the input has stopped changing for `delay` milliseconds.
 * 
 * DSA rationale: prevents O(N × M) filtering on every keystroke
 * by batching rapid changes into a single computation cycle.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
