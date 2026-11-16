import Link from "next/link";

import SignOutButton from "@/components/auth/SignOutButton";

const ADMIN_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/academics", label: "Academics" },
  { href: "/admin/offerings", label: "Offerings" },
];

/** Admin area chrome: a sub-navigation bar under the site header. Access is checked per page. */
function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Scrolls sideways on phones; the fade shows there is more. */}
          <nav
            aria-label="Admin"
            className="-mx-2 flex min-w-0 overflow-x-auto mask-[linear-gradient(to_right,black_80%,transparent)] pr-6 sm:mask-none sm:pr-0"
          >
            {ADMIN_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-3 text-sm font-semibold whitespace-nowrap text-secondary hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="shrink-0 py-2">
            <SignOutButton compact />
          </div>
        </div>
      </div>
      {children}
    </>
  );
}

export default AdminLayout;
