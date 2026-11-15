// GHTI's own words for the public pages. Everything here comes from the client
// (docs/client_inputs.md). Until it arrives, values are null and pages show a
// clearly marked placeholder. In step 3.5 this moves into the `site_content`
// table so admins can edit it without a developer.

export type FaithArticle = { title: string; body: string };

export const content = {
  /** Client input #9. One or two sentences. */
  vision: null as string | null,
  /** Client input #9. */
  mission: null as string | null,
  /** Client input #9. Paragraphs, oldest first. */
  history: null as string[] | null,
  /** Client input #9. Each article of the Statement of Faith. */
  statementOfFaith: null as FaithArticle[] | null,
  /** Client input #10. Search text for the map, e.g. the campus address. */
  mapQuery: null as string | null,
  /** Client input #10, e.g. "Monday to Friday, 9am to 4pm". */
  officeHours: null as string | null,
  /** Client input #13. Legal name of the data controller for the privacy notice. */
  dataController: null as string | null,
  /** Client input #13. Where people send data-protection requests. */
  privacyEmail: null as string | null,
};
