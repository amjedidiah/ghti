import { LEVEL_LABELS, type ProgrammeLevel } from "@/lib/programmes";
import { termLabel } from "@/lib/validation/academics";
import { STUDENT_STATUS_LABELS, type StudentStatus } from "@/lib/validation/students";

export type StudentRecord = {
  matric_no: string;
  status: StudentStatus;
  programme: { title: string; level: ProgrammeLevel } | null;
  entry_term: { name: string; session: string } | null;
};

/** Matric number, status, programme and entry term. Read-only for the student. */
function StudentRecordCard({ record }: { record: StudentRecord }) {
  return (
    <section
      aria-labelledby="record-heading"
      className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <h2 id="record-heading" className="font-display text-xl font-bold text-primary">
        Student record
      </h2>
      <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-semibold text-secondary">Matric number</dt>
          <dd className="mt-1 text-2xl font-bold tracking-tight break-all text-primary lining-nums tabular-nums">
            {record.matric_no}
          </dd>
        </div>
        <Item label="Status" value={STUDENT_STATUS_LABELS[record.status]} />
        <Item
          label="Programme"
          value={
            record.programme
              ? `${record.programme.title} (${LEVEL_LABELS[record.programme.level].singular})`
              : "Ask the registrar"
          }
        />
        <Item
          label="Entry term"
          value={record.entry_term ? termLabel(record.entry_term) : "Ask the registrar"}
        />
      </dl>
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-secondary">{label}</dt>
      <dd className="mt-1 text-primary">{value}</dd>
    </div>
  );
}

export default StudentRecordCard;
