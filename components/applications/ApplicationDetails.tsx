import type { ReactNode } from "react";

import { rowToValues } from "@/lib/applications/mapping";
import { LEVEL_LABELS, type ProgrammeLevel } from "@/lib/programmes";
import type { Database } from "@/lib/supabase/database.types";
import { formatPhone } from "@/lib/validation/application";

type ApplicationWithLabels = Database["public"]["Tables"]["applications"]["Row"] & {
  programme: { title: string; level: ProgrammeLevel } | null;
  intake: { session: string; name: string } | null;
};

const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "long" });
const dateTimeFormat = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * An application's biodata, read-only, as panels: programme, personal details,
 * education, next of kin and referee, declaration. Shared by the admin review
 * page and the student's own record.
 */
function ApplicationDetails({ application }: { application: ApplicationWithLabels }) {
  const values = rowToValues(application);
  const phone = (value: string) => (value ? formatPhone(value) : "");

  return (
    <>
      <Panel title="Programme">
        <Rows
          rows={[
            [
              "Programme",
              application.programme
                ? `${application.programme.title} (${LEVEL_LABELS[application.programme.level].singular})`
                : "",
            ],
            [
              "Intake",
              application.intake ? `${application.intake.name}, ${application.intake.session}` : "",
            ],
          ]}
        />
      </Panel>

      <Panel title="Personal details">
        <Rows
          rows={[
            ["Surname", values.surname],
            ["First name", values.firstName],
            ["Other names", values.otherNames],
            [
              "Date of birth",
              values.dateOfBirth ? dateFormat.format(new Date(values.dateOfBirth)) : "",
            ],
            [
              "Gender",
              values.gender === "female" ? "Female" : values.gender === "male" ? "Male" : "",
            ],
            ["Phone", phone(values.phone)],
            ["Email", values.email],
            ["Address", values.address],
            ["State of origin", values.stateOfOrigin],
            ["Nationality", values.nationality],
            ["CRM branch or church", values.crmBranch],
          ]}
        />
      </Panel>

      <Panel title="Education">
        {values.education.length === 0 ? (
          <p className="text-sm text-secondary">None given.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {values.education.map((entry, index) => (
              <li key={index} className="py-2">
                <p className="font-semibold text-primary">{entry.institution}</p>
                <p className="text-secondary">
                  {entry.qualification}
                  {entry.year && `, ${entry.year}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Next of kin and referee">
        <Rows
          rows={[
            ["Next of kin", values.nextOfKinName],
            ["Relationship", values.nextOfKinRelationship],
            ["Next of kin's phone", phone(values.nextOfKinPhone)],
            ["Referee", values.refereeName],
            ["Referee's position", values.refereePosition],
            ["Referee's phone", phone(values.refereePhone)],
            ["Referee's email", values.refereeEmail],
          ]}
        />
      </Panel>

      <Panel title="Declaration">
        <p className="text-sm text-secondary">
          {application.consent_given_at
            ? `Consent given ${dateTimeFormat.format(new Date(application.consent_given_at))}.`
            : "Consent not given yet."}
        </p>
      </Panel>
    </>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-xl font-bold text-primary">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="font-semibold text-primary">{label}</dt>
          <dd className="mt-0.5 break-words whitespace-pre-line text-secondary">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default ApplicationDetails;
