import { useState, useEffect } from "react";

/**
 * Debounce a value — returns a lagging copy that only updates
 * after `delay` ms of inactivity. Perfect for search inputs:
 * type into the fast value, run effects off the debounced one.
 */
export function useDebounceValue<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
