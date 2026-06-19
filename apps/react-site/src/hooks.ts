import { useEffect, useState } from "react";

export type AsyncState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: Error };

export function useAsyncData<T>(key: string, load: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading", data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setState({ status: "loading", data: null, error: null });
    });
    load()
      .then((data) => {
        if (!cancelled) setState({ status: "success", data, error: null });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ status: "error", data: null, error });
      });

    return () => {
      cancelled = true;
    };
  }, [key, load]);

  return state;
}
