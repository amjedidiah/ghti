import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import PageHeader from "@/components/shared/PageHeader";

/** Placeholder for pages linked from the header that later steps will build. */
function ComingSoon({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <PageHeader eyebrow="Coming soon" title={title}>
        {children}
      </PageHeader>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/academics"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-strong hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Browse our programmes
        </Link>
      </div>
    </>
  );
}

export default ComingSoon;
