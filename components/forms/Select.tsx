import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { inputClassName } from "@/components/forms/TextInput";
import { cn } from "@/lib/utils";

/** Native select (best on phones) styled like the text inputs. */
function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(inputClassName, "appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-secondary"
        aria-hidden
      />
    </div>
  );
}

export default Select;
