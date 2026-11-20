import type { Metadata } from "next";
import { Suspense } from "react";

import { Panel } from "@/components/applications/ApplicationDetails";
import InviteStaffForm from "@/components/admin/InviteStaffForm";
import ResendInvitationButton from "@/components/admin/ResendInvitationButton";
import StaffRoleForm from "@/components/admin/StaffRoleForm";
import PageHeader from "@/components/shared/PageHeader";
import { changeStaffRole } from "@/lib/admin/users";
import { requireRole } from "@/lib/auth/session";
import { listStaff } from "@/lib/queries/admin-staff";
import { cn } from "@/lib/utils";
import { STAFF_ROLE_LABELS, staffStatus, type StaffRole } from "@/lib/validation/staff";

export const metadata: Metadata = { title: "Staff", robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

function UsersPage() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Staff">
        <p>
          Invite lecturers and admins, and change what they can do. Staff are always invited: nobody
          can sign up as staff.
        </p>
      </PageHeader>
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-5 lg:px-8">
        <Suspense fallback={<p className="text-secondary">Loading staff…</p>}>
          <UsersContent />
        </Suspense>
      </div>
    </>
  );
}

async function UsersContent() {
  const me = await requireRole("admin");
  const staff = await listStaff();

  return (
    <>
      <div className="lg:col-span-3">
        <Panel title={`Staff (${staff.length})`}>
          <ul className="divide-y divide-border">
            {staff.map((person) => {
              const status = staffStatus(person);
              const role = person.role as StaffRole;
              const isMe = person.id === me.id;
              return (
                <li key={person.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0">
                      <p className="font-semibold text-primary">
                        {person.full_name || "(no name)"}
                        {isMe && (
                          <span className="ml-2 text-sm font-normal text-secondary">(you)</span>
                        )}
                      </p>
                      <p className="text-sm break-all text-secondary">{person.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-sm">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 font-semibold ring-1 ring-inset",
                          role === "admin"
                            ? "bg-brand/10 text-brand ring-brand/30"
                            : "bg-accent-soft/40 text-accent-strong ring-accent/40",
                        )}
                      >
                        {STAFF_ROLE_LABELS[role]}
                      </span>
                      <span
                        className={status === "invited" ? "text-accent-strong" : "text-secondary"}
                      >
                        {status === "invited"
                          ? `Invited ${person.invited_at ? dateFormat.format(new Date(person.invited_at)) : ""}`
                          : person.last_sign_in_at
                            ? `Last signed in ${dateFormat.format(new Date(person.last_sign_in_at))}`
                            : "Active"}
                      </span>
                    </div>
                  </div>
                  {!isMe && (
                    <div className="flex flex-wrap items-start gap-3">
                      <StaffRoleForm
                        current={role}
                        who={person.full_name || person.email}
                        action={changeStaffRole.bind(null, person.id)}
                      />
                      {status === "invited" && <ResendInvitationButton userId={person.id} />}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
      <div className="lg:col-span-2">
        <Panel title="Invite staff">
          <InviteStaffForm />
        </Panel>
      </div>
    </>
  );
}

export default UsersPage;
