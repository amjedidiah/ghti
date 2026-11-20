import { renderToBuffer } from "@react-pdf/renderer";

import TranscriptDocument from "@/components/pdf/TranscriptDocument";
import { requireRole } from "@/lib/auth/session";
import { getMyRegistrations, getMyStudentRecord } from "@/lib/queries/student";
import { buildTranscript, transcriptFileName } from "@/lib/transcript";

/**
 * The signed-in student's unofficial transcript as a PDF: published grades
 * only (RLS returns nothing else), built on request and never stored. The
 * file name carries the date only.
 */
export async function GET() {
  const user = await requireRole("student");
  const [record, registrations] = await Promise.all([
    getMyStudentRecord(user.id),
    getMyRegistrations(user.id),
  ]);
  if (!record) return new Response("No student record", { status: 404 });

  const now = new Date();
  const transcript = buildTranscript({ name: user.fullName, record, registrations, now });
  const pdf = await renderToBuffer(<TranscriptDocument transcript={transcript} />);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${transcriptFileName(now)}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
