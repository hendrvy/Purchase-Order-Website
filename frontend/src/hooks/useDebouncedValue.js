import { useEffect, useState } from 'react'

/**
 * Returns a debounced copy of `value` that only updates once `delay` ms have
 * passed without a change. Used to keep a text search input from firing a
 * server query on every keystroke.
 *
 * @template T
 * @param {T} value
 * @param {number} [delay]
 * @returns {T}
 */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
