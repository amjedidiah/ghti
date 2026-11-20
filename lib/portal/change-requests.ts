"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { sendChangeRequestReceived } from "@/lib/email/send";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/auth";
import { parseFormData } from "@/lib/validation/form";
import { changeRequestSchema } from "@/lib/validation/students";

// "Request a change" (Stage 3, step 3.5): a student asks the registrar to
// correct their record. RLS makes it theirs; a trigger keeps at most three
// open. The office is emailed a link, never the request or a name.

export async function requestChange(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("student");
  const parsed = parseFormData(changeRequestSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createClient();
  const { error } = await supabase.from("change_requests").insert({ body: parsed.data.body });
  if (error?.code === "55000") {
    return {
      status: "error",
      message: "You already have 3 requests waiting. The registrar will deal with them first.",
    };
  }
  if (error) return { status: "error", message: "Something went wrong. Please try again." };

  after(() => sendChangeRequestReceived(user.id));
  revalidatePath("/portal/record");
  return {
    status: "success",
    message: "Sent. The registrar will look at it, and you will see the outcome here.",
  };
}
