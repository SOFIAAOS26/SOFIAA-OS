"use client";

import { usePathname } from "next/navigation";
import { getActiveExtension } from "@/extensions/registry";
import type { SofiaExtension } from "@/extensions/types";

/**
 * Returns the currently active extension (or null) based on the URL.
 * No state, no localStorage — purely derived from the pathname.
 */
export function useExtension(): SofiaExtension | null {
  const pathname = usePathname();
  return getActiveExtension(pathname);
}
