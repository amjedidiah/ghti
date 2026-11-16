import { LogOut } from "lucide-react";

import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

/**
 * Sign-out as a form POST, so it works without JavaScript and cannot be triggered by a link.
 * `compact` shows only the icon on phones (the label stays for screen readers), to leave
 * room for a navigation bar beside it.
 */
function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-border text-sm font-semibold text-primary hover:bg-muted",
          compact ? "size-11 justify-center sm:size-auto sm:px-4 sm:py-2" : "px-4 py-2",
        )}
      >
        <LogOut className="size-4" aria-hidden />
        <span className={cn(compact && "sr-only sm:not-sr-only")}>Sign out</span>
      </button>
    </form>
  );
}

export default SignOutButton;
