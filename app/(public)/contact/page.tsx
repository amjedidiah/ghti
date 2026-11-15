import type { Metadata } from "next";

import ComingSoon from "@/components/shared/ComingSoon";

export const metadata: Metadata = { title: "Contact" };

function ContactPage() {
  return (
    <ComingSoon title="Contact & directions">
      <p>Office phone numbers, addresses and a map to the campus will be here soon.</p>
    </ComingSoon>
  );
}

export default ContactPage;
