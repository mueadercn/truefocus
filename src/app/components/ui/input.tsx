import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-lg border border-[#E8E8E8] dark:border-[#2A2A2A] bg-[#FFFFFF] dark:bg-[#151515] px-4 py-3 text-base text-[#1A1A1A] dark:text-[#F5F5F5] transition-all duration-300 outline-none",
        "placeholder:text-[#6B6B6B] dark:placeholder:text-[#A0A0A0]",
        "focus:border-[#8B7355] dark:focus:border-[#A89580] focus:ring-2 focus:ring-[#8B7355]/20 dark:focus:ring-[#A89580]/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:inline-flex file:h-9 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-[#8B7355] dark:file:text-[#A89580]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };