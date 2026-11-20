import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, mock, test } from "bun:test";

import type { ApplicationActionResult } from "@/lib/applications/actions";
import type { ApplicationValues } from "@/lib/validation/application";

// DocumentUpload calls the upload actions directly; nothing here uploads.
mock.module("@/lib/applications/actions", () => ({
  recordDocument: async () => ({ ok: false, message: "not in tests" }),
  removeDocument: async () => ({ ok: false }),
}));

const { default: ApplicationForm } = await import("@/components/applications/ApplicationForm");

const PROGRAMME = "7b0e7f4e-8a51-4c5e-9d4b-2f7f0e3c1a11";
const INTAKE = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
const noReferee = { name: "", address: "", occupation: "", email: "", phone: "" };

const empty: ApplicationValues = {
  programmeId: "",
  intakeTermId: "",
  title: "",
  surname: "Obi",
  firstName: "Ada",
  otherNames: "",
  dateOfBirth: "",
  gender: "",
  nationality: "",
  maritalStatus: "",
  phone: "",
  email: "ada@example.com",
  address: "",
  permanentAddress: "",
  nextOfKinName: "",
  nextOfKinRelationship: "",
  nextOfKinPhone: "",
  nextOfKinEmail: "",
  nextOfKinOccupation: "",
  nextOfKinAddress: "",
  occupation: "",
  employer: "",
  natureOfWork: "",
  bornAgain: "",
  bornAgainWhen: "",
  church: "",
  churchMembership: "",
  churchDuties: "",
  pastorName: "",
  pastorPhone: "",
  education: [],
  referees: [noReferee, noReferee],
  pledge: false,
  consent: false,
};

const complete: ApplicationValues = {
  ...empty,
  programmeId: PROGRAMME,
  intakeTermId: INTAKE,
  dateOfBirth: "2000-05-17",
  gender: "female",
  nationality: "Nigerian",
  maritalStatus: "married",
  phone: "0803 123 4567",
  address: "PO Box 12, Owerri",
  permanentAddress: "12 Church Road, Enugu",
  nextOfKinName: "Ngozi Obi",
  nextOfKinRelationship: "Mother",
  nextOfKinPhone: "0805 000 0000",
  bornAgain: "yes",
  church: "Grace Chapel, Owerri",
  pastorName: "Pastor John Eze",
  pastorPhone: "0803 000 0001",
  education: [{ institution: "FGC", address: "", from: "", to: "", certificate: "WASSCE" }],
  referees: [
    { ...noReferee, name: "Rev. Uche Okeke", phone: "0803 000 0002" },
    { ...noReferee, name: "Mrs Ifeoma Nwosu", phone: "0803 000 0003" },
  ],
  pledge: true,
  consent: true,
};

const file = (id: string) => ({ id, kind: "x", fileName: `${id}.pdf`, sizeBytes: 1000 });

function setup({
  values = empty,
  step = 1,
  submitResult = { status: "saved", savedAt: new Date().toISOString() },
}: {
  values?: ApplicationValues;
  step?: number;
  submitResult?: ApplicationActionResult;
} = {}) {
  const save = mock(async (...args: [ApplicationValues]): Promise<ApplicationActionResult> => {
    void args;
    return { status: "saved", savedAt: new Date().toISOString() };
  });
  const submit = mock(async (...args: [ApplicationValues]) => {
    void args;
    return submitResult;
  });
  render(
    <ApplicationForm
      applicationId="a"
      ownerId="u"
      initialValues={values}
      initialStep={step}
      initialDocuments={{
        transcript: [file("certificate")],
        photo: [file("photo")],
        id_card: [],
        endorsement: [],
        payment_proof: [],
      }}
      programmes={[{ id: PROGRAMME, title: "Certificate in Theology", level: "certificate" }]}
      intakes={[{ id: INTAKE, label: "Second semester, 2026/2027" }]}
      fee="Waiting for GHTI"
      save={save}
      submit={submit}
    />,
  );
  return { save, submit, user: userEvent.setup() };
}

const current = () => document.querySelector('[aria-current="step"]')?.textContent;

beforeEach(() => window.history.replaceState(null, "", "/apply"));

describe("ApplicationForm", () => {
  test("Next with a missing required answer shows the errors and stays on the step", async () => {
    const { user, save } = setup();
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Choose a programme.")).toBeInTheDocument();
    expect(screen.getByText("Choose an intake.")).toBeInTheDocument();
    expect(current()).toContain("Programme");
    expect(save).not.toHaveBeenCalled();
  });

  test("Next with a complete step saves the draft and opens the next step, in the URL", async () => {
    const { user, save } = setup();
    await user.selectOptions(screen.getByLabelText("Programme applied for"), PROGRAMME);
    await user.selectOptions(screen.getByLabelText("Intake"), INTAKE);
    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => expect(current()).toContain("About you"));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].programmeId).toBe(PROGRAMME);
    expect(window.location.search).toBe("?step=2");
    expect(screen.getByRole("heading", { name: /About you/ })).toHaveFocus();
  });

  test("the stepper jumps straight to a step", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /Faith and church/ }));

    await waitFor(() => expect(current()).toContain("Faith and church"));
    expect(screen.getByRole("group", { name: "Are you born again?" })).toBeInTheDocument();
  });

  test("a submit the server refuses (the intake closed meanwhile) opens that step", async () => {
    const { user, submit } = setup({
      values: complete,
      step: 9,
      submitResult: {
        status: "error",
        message: "Your application is not complete yet.",
        fieldErrors: { intakeTermId: "Choose an intake that is open for applications." },
      },
    });
    await user.click(screen.getByRole("button", { name: /Submit/ }));

    await waitFor(() => expect(current()).toContain("Programme"));
    expect(submit).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Choose an intake that is open for applications.")).toBeInTheDocument();
    expect(screen.getByLabelText("Intake")).toHaveFocus();
  });
});
