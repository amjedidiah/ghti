import { z } from "zod";

// Shared by client forms (React Hook Form) and Server Actions. Messages are
// shown to users as-is: keep them specific and friendly.

export const MIN_PASSWORD_LENGTH = 8;

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .pipe(z.email("Enter a valid email address, like name@example.com."));

const newPassword = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(72, "Use 72 characters or fewer.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const emailOnlySchema = z.object({ email });

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(200, "Use 200 characters or fewer."),
  email,
  password: newPassword,
});

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string().min(1, "Type your new password again."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignInValues = z.infer<typeof signInSchema>;
export type EmailOnlyValues = z.infer<typeof emailOnlySchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** Result returned by auth Server Actions to `useActionState`. */
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialFormState: FormState = { status: "idle" };
