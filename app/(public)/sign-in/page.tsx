import type { Metadata } from "next";

import ComingSoon from "@/components/shared/ComingSoon";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

function SignInPage() {
  return (
    <ComingSoon title="Portal sign-in">
      <p>
        Applicants, students, lecturers and staff will sign in here to reach their part of the
        portal.
      </p>
    </ComingSoon>
  );
}

export default SignInPage;
