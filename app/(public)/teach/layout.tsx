import AreaBar from "@/components/layout/AreaBar";

const TEACH_LINKS = [{ href: "/teach", label: "My courses" }] as const;

/** Lecturer area chrome. Access is checked per page (requireRole("lecturer")). */
function TeachLayout({ children }: LayoutProps<"/teach">) {
  return (
    <>
      <AreaBar label="Lecturer area" root="/teach" links={TEACH_LINKS} />
      {children}
    </>
  );
}

export default TeachLayout;
