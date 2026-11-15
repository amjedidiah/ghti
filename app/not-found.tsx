import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-20 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-widest text-accent-strong uppercase">
          Page not found
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          We couldn&rsquo;t find that page
        </h1>
        <p className="mt-4 max-w-xl text-secondary">
          The link may be old or mistyped. Try our programmes, or go back to the home page.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/academics"
            className="inline-flex items-center justify-center rounded-md bg-brand px-6 py-3 font-semibold text-on-brand hover:bg-brand-deep"
          >
            Our programmes
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-brand px-6 py-3 font-semibold text-brand hover:bg-muted"
          >
            Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default NotFound;
