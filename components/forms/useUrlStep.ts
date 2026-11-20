"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The current step of a form in steps, kept in `?step=` so a reload or a
 * shared link opens the same step and the browser's Back button goes back a
 * step. Uses the native history API, which Next.js folds into its router
 * (no server round trip). `parse` turns the raw value into a valid step.
 */
export function useUrlStep(initial: number, parse: (value: string | null) => number) {
  const [step, setStep] = useState(initial);

  useEffect(() => {
    const onPopState = () =>
      setStep(parse(new URLSearchParams(window.location.search).get("step")));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [parse]);

  const goTo = useCallback((next: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("step", String(next));
    window.history.pushState(null, "", `?${params.toString()}`);
    setStep(next);
  }, []);

  return [step, goTo] as const;
}
