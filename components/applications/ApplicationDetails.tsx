import type { ReactNode } from "react";

import { rowToValues } from "@/lib/applications/mapping";
import { APPLICATION_STEPS } from "@/lib/applications/steps";
import { LEVEL_LABELS, type ProgrammeLevel } from "@/lib/programmes";
import type { Database } from "@/lib/supabase/database.types";
import { termLabel } from "@/lib/validation/academics";
import {
  formatPhone,
  MARITAL_STATUS_LABELS,
  type ApplicationValues,
} from "@/lib/validation/application";

// Calendar dates (date of birth) are stored without a time: format them in UTC
// so no time zone moves them to the day before.
const dateFormat = new Intl.DateTimeFormat("en-NG", { dateStyle: "long", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

const phone = (value: string) => (value ? formatPhone(value) : "");
const yesNo = { yes: "Yes", no: "No", "": "" } as const;
const stepTitle = (step: number) => APPLICATION_STEPS[step - 1].title;

/**
 * An application's answers, read-only, as panels in the order of the form's
 * steps. Used by the applicant's review step (with "Change" buttons), the
 * admin review, the student file and the student's own record.
 */
function ApplicationDetails({
  values,
  programme,
  intake,
  pledgeGivenAt,
  consentGivenAt,
  onEdit,
}: {
  values: ApplicationValues;
  programme: { title: string; level: ProgrammeLevel } | null;
  /** e.g. "Second semester, 2026/2027". */
  intake: string | null;
  pledgeGivenAt?: string | null;
  consentGivenAt?: string | null;
  /** On the review step: go back to a step (1-based) to change it. */
  onEdit?: (step: number) => void;
}) {
  const section = (step: number, children: ReactNode) => (
    <Panel
      title={stepTitle(step)}
      action={
        onEdit && (
          <button
            type="button"
            onClick={() => onEdit(step)}
            className="text-sm font-semibold text-accent-strong hover:underline"
          >
            Change<span className="sr-only"> {stepTitle(step).toLowerCase()}</span>
          </button>
        )
      }
    >
      {children}
    </Panel>
  );

  return (
    <>
      {section(
        1,
        <Rows
          rows={[
            [
              "Programme",
              programme ? `${programme.title} (${LEVEL_LABELS[programme.level].singular})` : "",
            ],
            ["Intake", intake ?? ""],
          ]}
        />,
      )}

      {section(
        2,
        <Rows
          rows={[
            ["Title", values.title],
            ["Surname", values.surname],
            ["First name", values.firstName],
            ["Middle or other names", values.otherNames],
            [
              "Date of birth",
              values.dateOfBirth ? dateFormat.format(new Date(values.dateOfBirth)) : "",
            ],
            ["Sex", values.gender === "female" ? "Female" : values.gender === "male" ? "Male" : ""],
            ["Nationality", values.nationality],
            [
              "Marital status",
              values.maritalStatus ? MARITAL_STATUS_LABELS[values.maritalStatus] : "",
            ],
            ["Phone", phone(values.phone)],
            ["Email", values.email],
          ]}
        />,
      )}

      {section(
        3,
        <Rows
          rows={[
            ["Current postal address", values.address],
            ["Permanent home address", values.permanentAddress],
            ["Next of kin", values.nextOfKinName],
            ["Relationship", values.nextOfKinRelationship],
            ["Next of kin's phone", phone(values.nextOfKinPhone)],
            ["Next of kin's email", values.nextOfKinEmail],
            ["Next of kin's occupation", values.nextOfKinOccupation],
            ["Next of kin's contact address", values.nextOfKinAddress],
          ]}
        />,
      )}

      {section(
        4,
        <Rows
          rows={[
            ["Present occupation", values.occupation],
            ["Employer", values.employer],
            ["Nature of work", values.natureOfWork],
          ]}
        />,
      )}

      {section(
        5,
        <Rows
          rows={[
            ["Born again", yesNo[values.bornAgain]],
            ["When", values.bornAgainWhen],
            ["Church (name and location)", values.church],
            ["Member for", values.churchMembership],
            ["Duties in the church", values.churchDuties],
            ["Pastor", values.pastorName],
            ["Pastor's phone", phone(values.pastorPhone)],
          ]}
        />,
      )}

      {section(
        6,
        values.education.length === 0 ? (
          <p className="text-sm text-secondary">None given.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {values.education.map((entry, index) => (
              <li key={index} className="py-2">
                <p className="font-semibold text-primary">{entry.institution || "—"}</p>
                <p className="text-secondary">
                  {[
                    entry.certificate,
                    entry.from || entry.to ? `${entry.from || "?"} to ${entry.to || "?"}` : "",
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {entry.address && <p className="text-secondary">{entry.address}</p>}
              </li>
            ))}
          </ul>
        ),
      )}

      {section(
        7,
        <div className="space-y-5">
          {values.referees.map((referee, index) => (
            <div key={index}>
              <h3 className="mb-2 text-sm font-semibold text-secondary">Referee {index + 1}</h3>
              <Rows
                rows={[
                  ["Name", referee.name],
                  ["Phone", phone(referee.phone)],
                  ["Email", referee.email],
                  ["Occupation", referee.occupation],
                  ["Postal address", referee.address],
                ]}
              />
            </div>
          ))}
        </div>,
      )}

      {!onEdit && (
        <Panel title="Pledge and declaration">
          <Rows
            rows={[
              [
                "Pledge to abide by GHTI's rules",
                pledgeGivenAt ? `Made ${dateTimeFormat.format(new Date(pledgeGivenAt))}` : "",
              ],
              [
                "Consent to use this information",
                consentGivenAt ? `Given ${dateTimeFormat.format(new Date(consentGivenAt))}` : "",
              ],
            ]}
          />
        </Panel>
      )}
    </>
  );
}

type ApplicationWithLabels = Database["public"]["Tables"]["applications"]["Row"] & {
  programme: { title: string; level: ProgrammeLevel } | null;
  intake: { session: string; name: string } | null;
};

/** ApplicationDetails' props from a stored application (with programme and intake). */
export function detailsOf(application: ApplicationWithLabels) {
  return {
    values: rowToValues(application),
    programme: application.programme,
    intake: application.intake ? termLabel(application.intake) : null,
    pledgeGivenAt: application.pledge_given_at,
    consentGivenAt: application.consent_given_at,
  };
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  /** Shown beside the title, e.g. a "Change" button. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-bold text-primary">{title}</h2>
        {action}
      </div>
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
