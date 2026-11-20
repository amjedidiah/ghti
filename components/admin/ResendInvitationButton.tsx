"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { resendInvitation } from "@/lib/admin/users";

/** Send a pending staff member their invitation email again. */
function ResendInvitationButton({ userId }: { userId: string }) {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await resendInvitation(userId)))}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-primary hover:bg-muted disabled:cursor-wait disabled:opacity-80"
      >
        {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        Resend invitation
      </button>
      {result && (
        <span
          role={result.ok ? "status" : "alert"}
          className={result.ok ? "text-sm text-success" : "text-sm text-danger"}
        >
          {result.message}
        </span>
      )}
    </span>
  );
}

export default ResendInvitationButton;
