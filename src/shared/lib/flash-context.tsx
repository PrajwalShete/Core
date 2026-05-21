import { createContext, useContext } from 'react';

/** Set of task IDs that just changed — used to apply a brief accent flash. */
const FlashContext = createContext<Set<string>>(new Set());

export const FlashProvider = FlashContext.Provider;

export function useIsFlashing(id: string): boolean {
  const set = useContext(FlashContext);
  return set.has(id);
}
