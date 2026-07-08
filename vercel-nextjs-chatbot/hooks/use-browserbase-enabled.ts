"use client";

import useSWR from "swr";

type BrowserbaseStatus = {
  enabled: boolean;
};

/**
 * Returns whether Browserbase is configured (for attachment UI gating).
 */
export function useBrowserbaseEnabled() {
  const { data } = useSWR<BrowserbaseStatus>(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/browserbase/status`,
    (url: string) => fetch(url).then((response) => response.json()),
    { revalidateOnFocus: false }
  );

  return data?.enabled ?? false;
}
