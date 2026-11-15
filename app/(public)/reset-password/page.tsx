import type { Metadata } from "next";

import AuthCard from "@/components/auth/AuthCard";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

// Reached from a password-reset or staff-invitation email; the proxy requires a session.
function ResetPasswordPage() {
  return (
    <AuthCard
      title="Choose a new password"
      description="You will use it with your email address to sign in."
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}

export default ResetPasswordPage;
