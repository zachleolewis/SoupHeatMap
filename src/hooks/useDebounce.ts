import { useEffect, useState } from 'react';

/**
 * Debounce a value - only update after specified delay
 * Prevents expensive re-renders during rapid changes (e.g. color pickers)
 */
export function useDebounce<T>(value: T, delay: number = 150): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

