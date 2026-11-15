import type { ComponentProps } from "react";

import { inputClassName } from "@/components/forms/TextInput";
import { cn } from "@/lib/utils";

function Textarea({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(inputClassName, "resize-y", className)} {...props} />;
}

export default Textarea;
