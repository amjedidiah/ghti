"use server";

import type { AuthError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { z } from "zod";

import { ROLE_HOME, safeNextPath } from "@/lib/auth/rules";
import { createClient } from "@/lib/supabase/server";
import {
  emailOnlySchema,
  registerSchema,
  resetPasswordSchema,
  signInSchema,
  type FormState,
} from "@/lib/validation/auth";

// Never log or echo personal data from these actions (NDPA 2023).

/**
 * Where auth emails send people back to: /auth/confirm on the site the request
 * came from (production or a preview). Server Actions reject cross-origin
 * posts, so Origin is this site. The URL must be on Supabase's redirect allow list.
 */
async function confirmUrl(next?: string): Promise<string> {
  const origin =
    (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = new URL("/auth/confirm", origin);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

const GENERIC_ERROR = "Something went wrong on our side. Please try again in a moment.";

function parse<S extends z.ZodType>(schema: S, formData: FormData) {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (result.success) return { ok: true, data: result.data as z.infer<S> } as const;
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  const state: FormState = {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors,
  };
  return { ok: false, state } as const;
}

const RATE_LIMITED = new Set(["over_email_send_rate_limit", "over_request_rate_limit"]);

function friendlyAuthError(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "That email and password do not match. Check them and try again.";
    case "email_not_confirmed":
      return "Please confirm your email address first. Open the link we emailed you when you registered.";
    case "email_address_invalid":
      return "We cannot send email to that address. Check it for typos, or use a different email.";
    case "weak_password":
      return "Choose a stronger password: at least 8 characters, ideally a short phrase.";
    case "same_password":
      return "Choose a password different from your current one.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a minute and try again.";
    case "session_not_found":
    case "session_expired":
    case "refresh_token_not_found":
      return "Your link has expired. Request a new one and try again.";
    default:
      return GENERIC_ERROR;
  }
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(signInSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: friendlyAuthError(error) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  const home = ROLE_HOME[profile?.role ?? "applicant"];
  const next = formData.get("next");
  redirect(safeNextPath(typeof next === "string" ? next : null, home));
}

export async function sendSignInLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(emailOnlySchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    // Links only sign in existing accounts; registering needs a name and password.
    options: { shouldCreateUser: false, emailRedirectTo: await confirmUrl() },
  });

  // Any other error (e.g. no such account) still reports success, so the form
  // cannot be used to find out who has an account.
  if (error?.code && RATE_LIMITED.has(error.code)) {
    return { status: "error", message: friendlyAuthError(error) };
  }
  return {
    status: "success",
    message:
      "If there is an account for that email, a sign-in link is on its way. It expires in one hour.",
  };
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(registerSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: await confirmUrl(),
    },
  });
  if (error) return { status: "error", message: friendlyAuthError(error) };

  // With email confirmation on, an existing email also lands here (Supabase
  // hides it), so the message works for both cases.
  return {
    status: "success",
    message:
      "We have sent a confirmation link to your email. Open it to finish creating your account, then you can start your application.",
  };
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parse(emailOnlySchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: await confirmUrl("/reset-password"),
  });
  if (error?.code && RATE_LIMITED.has(error.code)) {
    return { status: "error", message: friendlyAuthError(error) };
  }
  return {
    status: "success",
    message:
      "If there is an account for that email, a link to reset your password is on its way. It expires in one hour.",
  };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(resetPasswordSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: friendlyAuthError(error) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  redirect(ROLE_HOME[profile?.role ?? "applicant"]);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
