import AreaBar from "@/components/layout/AreaBar";

const ADMIN_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/academics", label: "Academics" },
  { href: "/admin/offerings", label: "Offerings" },
  { href: "/admin/grades", label: "Grades" },
  { href: "/admin/exports", label: "Exports" },
  { href: "/admin/content", label: "Site content" },
  { href: "/admin/users", label: "Staff" },
] as const;

/** Admin area chrome: a sub-navigation bar under the site header. Access is checked per page. */
function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <AreaBar label="Admin" root="/admin" links={ADMIN_LINKS} />
      {children}
    </>
  );
}

export default AdminLayout;
