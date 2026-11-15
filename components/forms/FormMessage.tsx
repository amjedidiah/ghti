import { CircleAlert, CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/** Form-level message: an error summary or a success confirmation. Announced to screen readers. */
function FormMessage({ status, message }: { status: "error" | "success"; message: string }) {
  const Icon = status === "error" ? CircleAlert : CircleCheck;
  return (
    <div
      role={status === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-md border p-4 text-sm leading-relaxed",
        status === "error"
          ? "border-danger/30 bg-danger-soft text-danger"
          : "border-success/30 bg-success-soft text-success",
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p>{message}</p>
    </div>
  );
}

export default FormMessage;
