import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, mock, test } from "bun:test";

import GradeSheetForm, { type SheetRow } from "@/components/grades/GradeSheetForm";
import type { SheetMode } from "@/lib/grade-sheet";
import type { FormState } from "@/lib/validation/auth";

const rows: SheetRow[] = [
  { registrationId: "r1", name: "Ada Obi", matric: "GHTI/001", ca: "", exam: "", status: null },
  {
    registrationId: "r2",
    name: "Bayo Ade",
    matric: "GHTI/002",
    ca: "30",
    exam: "50",
    status: "submitted",
  },
  {
    registrationId: "r3",
    name: "Chidi Eze",
    matric: "GHTI/003",
    ca: "20",
    exam: "40",
    status: "published",
  },
];

function setup(mode: SheetMode) {
  const action = mock(async (...args: [FormState, FormData]): Promise<FormState> => {
    void args;
    return { status: "success", message: "Saved." };
  });
  render(
    <GradeSheetForm
      mode={mode}
      action={action}
      rows={rows}
      scale={[
        { min_score: 70, letter: "A", grade_point: 5 },
        { min_score: 0, letter: "F", grade_point: 0 },
      ]}
      split={{ ca: 40, exam: 60 }}
    />,
  );
  return { action, user: userEvent.setup() };
}

describe("GradeSheetForm for lecturers", () => {
  test("submitted and published grades are read-only; only open rows are sent", async () => {
    const { user, action } = setup("lecturer");
    expect(screen.getByLabelText("CA for Ada Obi")).toBeInTheDocument();
    expect(screen.queryByLabelText("CA for Bayo Ade")).toBeNull();
    expect(screen.queryByLabelText("CA for Chidi Eze")).toBeNull();
    expect(screen.queryByLabelText(/Reason for changing/)).toBeNull();

    await user.type(screen.getByLabelText("CA for Ada Obi"), "35");
    await user.type(screen.getByLabelText("Exam for Ada Obi"), "50");
    await user.click(screen.getByRole("button", { name: "Save and submit for approval" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const sent = action.mock.calls[0][1];
    expect(sent.get("intent")).toBe("finalise");
    expect(sent.get("ca:r1")).toBe("35");
    expect(sent.has("ca:r2")).toBe(false);
  });

  test("a CSV import previews the changes and fills the sheet without saving", async () => {
    const { user, action } = setup("lecturer");
    await user.click(screen.getByText("Import scores from a spreadsheet"));
    const csv = "Matric No,CA,Exam\nghti/001,28,44\nGHTI/002,31,50\nGHTI/404,10,10\n";
    await user.upload(
      screen.getByLabelText("CSV file"),
      new File([csv], "scores.csv", { type: "text/csv" }),
    );

    expect(await screen.findByText("1 student would change.")).toBeInTheDocument();
    expect(screen.getByText(/Already submitted or published.*GHTI\/002/)).toBeInTheDocument();
    expect(screen.getByText("Not on this class list: GHTI/404.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fill in 1 student" }));
    expect(screen.getByLabelText("CA for Ada Obi")).toHaveValue("28");
    expect(screen.getByLabelText("Exam for Ada Obi")).toHaveValue("44");
    expect(screen.getByText(/filled in\. Check them, then save the sheet/)).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });
});

describe("GradeSheetForm for admins", () => {
  test("every row is editable, and changing a published grade asks for a reason", async () => {
    const { user } = setup("admin");
    expect(screen.getByRole("button", { name: "Save and publish" })).toBeInTheDocument();
    const published = screen.getByLabelText("Exam for Chidi Eze");
    expect(screen.queryByLabelText(/Reason for changing/)).toBeNull();

    await user.clear(published);
    await user.type(published, "45");
    expect(screen.getByLabelText(/Reason for changing published grades/)).toBeInTheDocument();
    const row = published.closest("li");
    expect(row && within(row).getByText("Edited")).toBeInTheDocument();
  });
});
