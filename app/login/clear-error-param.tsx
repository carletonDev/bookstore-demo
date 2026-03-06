"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Strips the ?error query param from the URL after the error banner renders.
 * Prevents the "Authentication failed" banner from reappearing on a manual
 * page refresh once the user has already seen and acknowledged the error.
 *
 * Rendered only when errorMessage is present (server-side condition).
 * Zero visible output — purely a URL cleanup side-effect.
 */
export function ClearErrorParam() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login", { scroll: false });
  }, [router]);

  return null;
}
