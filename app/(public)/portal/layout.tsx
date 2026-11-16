import AreaBar from "@/components/layout/AreaBar";

const PORTAL_LINKS = [
  { href: "/portal", label: "Overview" },
  { href: "/portal/results", label: "Results" },
  { href: "/portal/record", label: "My record" },
  { href: "/portal/history", label: "History" },
  { href: "/portal/account", label: "Account" },
] as const;

/** Student portal chrome. Access is checked per page (requireRole("student")). */
function PortalLayout({ children }: LayoutProps<"/portal">) {
  return (
    <>
      <AreaBar label="Student portal" root="/portal" links={PORTAL_LINKS} />
      {children}
    </>
  );
}

export default PortalLayout;
