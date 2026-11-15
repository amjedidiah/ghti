import Link from "next/link";

import { ROLE_HOME, type AppRole } from "@/lib/auth/rules";
import { getCurrentUser } from "@/lib/auth/session";
import { signInLink } from "@/lib/site";
import { cn } from "@/lib/utils";

const HOME_LABEL: Record<AppRole, string> = {
  applicant: "My application",
  student: "My portal",
  lecturer: "My courses",
  admin: "Admin",
};

const buttonClass =
  "rounded-md bg-accent px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-on-accent transition-colors hover:bg-accent-soft lg:ml-2 lg:px-4 lg:py-2";

/** Header button: "Sign in" for visitors, a link home for signed-in users. */
export async function AccountLink() {
  const user = await getCurrentUser();
  if (!user) return <SignInButton />;
  return (
    <Link href={ROLE_HOME[user.role]} className={buttonClass}>
      {HOME_LABEL[user.role]}
    </Link>
  );
}

/** Static fallback while the session is read (and for signed-out visitors). */
export function SignInButton({ className }: { className?: string }) {
  return (
    <Link href={signInLink.href} className={cn(buttonClass, className)}>
      <span className="lg:hidden">Sign in</span>
      <span className="hidden lg:inline">{signInLink.name}</span>
    </Link>
  );
}
