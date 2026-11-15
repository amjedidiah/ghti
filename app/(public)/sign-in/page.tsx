import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import AuthCard from "@/components/auth/AuthCard";
import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

function SignInPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Applicants, students, lecturers and staff all sign in here."
      footer={
        <>
          New applicant?{" "}
          <Link href="/apply/register" className="font-semibold text-accent-strong hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {/* The form reads ?next= and ?error= from the URL, which is request-time data. */}
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthCard>
  );
}

export default SignInPage;
