// Bulk registration (Stage 2, step 2.1): every ticked student on every ticked
// offering of a term. Pairs that already exist are skipped, so saving twice is
// harmless.

export type RegistrationPair = { student_id: string; offering_id: string };

export function pairKey(studentId: string, offeringId: string): string {
  return `${studentId}:${offeringId}`;
}

export function planRegistrations(
  studentIds: Iterable<string>,
  offeringIds: Iterable<string>,
  existing: Iterable<RegistrationPair>,
): { add: RegistrationPair[]; alreadyRegistered: number } {
  const known = new Set([...existing].map((pair) => pairKey(pair.student_id, pair.offering_id)));
  const offerings = [...new Set(offeringIds)];
  const add: RegistrationPair[] = [];
  let alreadyRegistered = 0;

  for (const studentId of new Set(studentIds)) {
    for (const offeringId of offerings) {
      if (known.has(pairKey(studentId, offeringId))) alreadyRegistered += 1;
      else add.push({ student_id: studentId, offering_id: offeringId });
    }
  }
  return { add, alreadyRegistered };
}

/** "6 registrations added; 2 were already registered." */
export function describeRegistrations(added: number, alreadyRegistered: number): string {
  const addedText =
    added === 0 ? "No new registrations" : `${added} registration${added === 1 ? "" : "s"} added`;
  const alreadyText =
    alreadyRegistered === 0
      ? ""
      : `; ${alreadyRegistered} ${alreadyRegistered === 1 ? "was" : "were"} already registered`;
  return `${addedText}${alreadyText}.`;
}
