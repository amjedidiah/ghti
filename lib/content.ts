// GHTI's own words for the public pages. Everything here comes from the client
// (docs/client_inputs.md). Until it arrives, values are null and pages show a
// clearly marked placeholder. In step 3.5 this moves into the `site_content`
// table so admins can edit it without a developer.

export type FaithArticle = { title: string; body: string };

export const content = {
  /** Client input #9. Home page welcome banner (received 16 Nov 2026). */
  welcome:
    "We train pastors, church workers, market men and women, born again Christians in every sphere of life. Join us now." as
      string | null,
  /**
   * Client input #9. One or two sentences (received 16 Nov 2026 as the
   * vision; GHTI renamed it the mission statement on 20 Nov 2026 and dropped
   * the vision).
   */
  mission:
    "To equip leaders with relevant training to love God and love people to Christ, live a Christ-like life and serve as agents of transformation in the society." as
      string | null,
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
  /** Client input (new, 20 Nov 2026). The application fee and how to pay it, e.g. bank details. */
  applicationFee: null as string | null,
};
