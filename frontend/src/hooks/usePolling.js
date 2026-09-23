import { useEffect, useRef, useState, useCallback } from "react";

// Polls `fetcher` every `intervalMs`, exposing the latest value, an error (if
// any), and a manual `refresh` so components can also trigger an immediate
// re-fetch right after an action they took (e.g. just POSTed a telemetry tick).
export function usePolling(fetcher, deps, intervalMs = 4000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(() => {
    let cancelled = false;
    fetcherRef
      .current()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cancel = refresh();
    const id = setInterval(refresh, intervalMs);
    return () => {
      cancel();
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, intervalMs]);

  return { data, error, refresh };
}
