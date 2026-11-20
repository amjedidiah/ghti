"use client";

import { Mail } from "lucide-react";
import { useState, useTransition } from "react";

import FormMessage from "@/components/forms/FormMessage";
import SubmitButton from "@/components/forms/SubmitButton";
import { emailResultNotices } from "@/lib/admin/grades";
import type { FormState } from "@/lib/validation/auth";

/** Sends the "results are out" email to this term's students who have not had it yet. */
function ResultNoticesButton({ termId, pending }: { termId: string; pending: number }) {
  const [state, setState] = useState<FormState | null>(null);
  const [busy, startTransition] = useTransition();

  function send() {
    setState(null);
    startTransition(async () => setState(await emailResultNotices(termId)));
  }

  return (
    <div className="space-y-3">
      {pending > 0 && (
        <SubmitButton type="button" onClick={send} pending={busy} className="sm:w-auto">
          {!busy && <Mail className="size-5" aria-hidden />}
          Email {pending} student{pending === 1 ? "" : "s"}
        </SubmitButton>
      )}
      {state?.message && state.status !== "idle" && (
        <FormMessage status={state.status} message={state.message} />
      )}
    </div>
  );
}

export default ResultNoticesButton;
