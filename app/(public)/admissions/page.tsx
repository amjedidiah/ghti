import type { Metadata } from "next";

import ComingSoon from "@/components/shared/ComingSoon";

export const metadata: Metadata = { title: "Admissions" };

function AdmissionsPage() {
  return (
    <ComingSoon title="Admissions">
      <p>
        Entry requirements, key dates and the online application will be here soon. You will be able
        to apply and upload your transcript from your phone.
      </p>
    </ComingSoon>
  );
}

export default AdmissionsPage;
