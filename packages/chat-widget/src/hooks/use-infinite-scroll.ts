import { useEffect, useState } from "react";

interface InfiniteScrollOptions {
  enabled: boolean;
  onLoadMore: () => Promise<void>;
}

export function useInfiniteScroll({
  enabled,
  onLoadMore,
}: InfiniteScrollOptions) {
  const [root, rootRef] = useState<HTMLElement | null>(null);
  const [sentinel, sentinelRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (
      !enabled ||
      !root ||
      !sentinel ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    let requested = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          requested ||
          !entries.some(
            (entry) => entry.target === sentinel && entry.isIntersecting,
          )
        ) {
          return;
        }
        requested = true;
        void onLoadMore().catch(() => {
          // The caller owns the error UI and decides when to re-enable loading.
        });
      },
      { root, threshold: 0 },
    );
    observer.observe(sentinel);

    return () => {
      requested = true;
      observer.disconnect();
    };
  }, [enabled, onLoadMore, root, sentinel]);

  return { rootRef, sentinelRef };
}
