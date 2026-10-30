import { useCallback, useRef, useState } from 'react';

const HISTORY_LIMIT = 100;
/** Coalesced commits closer together than this collapse into one undo step. */
const MERGE_MS = 1000;

interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

/** Undo/redo stack. Pass coalesce to merge rapid commits (typing, dragging) into one step. */
export function useHistory<T>(init: () => T) {
  const [history, setHistory] = useState<History<T>>(() => ({ past: [], present: init(), future: [] }));
  const lastCoalesceAt = useRef(0);

  const commit = useCallback((next: T, coalesce = false) => {
    const now = Date.now();
    const merge = coalesce && now - lastCoalesceAt.current < MERGE_MS;
    lastCoalesceAt.current = coalesce ? now : 0;
    setHistory((h) =>
      next === h.present
        ? h
        : {
            past: merge ? h.past : [...h.past, h.present].slice(-HISTORY_LIMIT),
            present: next,
            future: [],
          }
    );
  }, []);

  const undo = useCallback(() => {
    lastCoalesceAt.current = 0;
    setHistory((h) =>
      h.past.length === 0
        ? h
        : { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
    );
  }, []);

  const redo = useCallback(() => {
    lastCoalesceAt.current = 0;
    setHistory((h) =>
      h.future.length === 0
        ? h
        : { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
    );
  }, []);

  return {
    present: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    commit,
    undo,
    redo,
  };
}
