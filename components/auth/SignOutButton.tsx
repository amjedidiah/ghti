import { LogOut } from "lucide-react";

import { signOut } from "@/lib/auth/actions";

/** Sign-out as a form POST, so it works without JavaScript and cannot be triggered by a link. */
function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold text-primary hover:bg-muted"
      >
        <LogOut className="size-4" aria-hidden />
        Sign out
      </button>
    </form>
  );
}

export default SignOutButton;
