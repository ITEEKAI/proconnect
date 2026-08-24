import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  /** True only while the first result is still pending, so reloads never blank the page. */
  loading: boolean;
  /** True whenever a request is in flight, including background reloads. */
  busy: boolean;
  reload: () => void;
  setData: (updater: T | ((current: T | undefined) => T)) => void;
}

/** Runs `loader` on mount and whenever `deps` change, with a manual reload hook. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    loaderRef
      .current()
      .then((result) => {
        if (!cancelled) setDataState(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const setData = useCallback((updater: T | ((current: T | undefined) => T)) => {
    setDataState((current) =>
      typeof updater === 'function' ? (updater as (c: T | undefined) => T)(current) : updater,
    );
  }, []);

  return {
    data,
    error,
    loading: loading && data === undefined,
    busy: loading,
    reload: () => setNonce((n) => n + 1),
    setData,
  };
}

/** Debounces a rapidly-changing value (used by the directory search box). */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
