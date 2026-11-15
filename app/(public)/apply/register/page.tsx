import type { Metadata } from "next";
import Link from "next/link";

import AuthCard from "@/components/auth/AuthCard";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a GHTI applicant account to apply online.",
};

function RegisterPage() {
  return (
    <AuthCard
      title="Create an account"
      description="Your account lets you fill in your application, upload documents and follow its progress. You can stop and come back at any time."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-accent-strong hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}

export default RegisterPage;
