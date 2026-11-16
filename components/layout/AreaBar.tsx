import { Suspense } from "react";

import SignOutButton from "@/components/auth/SignOutButton";
import AreaNav, { AreaNavLinks } from "@/components/layout/AreaNav";

/** The bar under the site header in a signed-in area: section links and sign out. */
function AreaBar({
  label,
  root,
  links,
}: {
  label: string;
  root: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* The current path is request data: the plain links show until it is known. */}
        <Suspense fallback={<AreaNavLinks label={label} links={links} active={null} />}>
          <AreaNav label={label} root={root} links={links} />
        </Suspense>
        <div className="shrink-0 py-2">
          <SignOutButton compact />
        </div>
      </div>
    </div>
  );
}

export default AreaBar;
