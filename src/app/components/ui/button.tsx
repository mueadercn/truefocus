import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#8B7355] dark:focus-visible:ring-[#A89580]",
  {
    variants: {
      variant: {
        default: "bg-[#8B7355] dark:bg-[#A89580] text-white hover:bg-[#6D5A43] dark:hover:bg-[#C4B5A0] hover:-translate-y-0.5 shadow-sm hover:shadow-md rounded-lg",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 hover:-translate-y-0.5 shadow-sm hover:shadow-md rounded-lg",
        outline:
          "border border-[#8B7355] dark:border-[#A89580] bg-transparent text-[#8B7355] dark:text-[#A89580] hover:bg-[#8B7355] hover:text-white dark:hover:bg-[#A89580] dark:hover:text-[#0A0A0A] rounded-lg",
        secondary:
          "bg-[#E8E8E8] dark:bg-[#2A2A2A] text-[#1A1A1A] dark:text-[#F5F5F5] hover:bg-[#6B6B6B] hover:text-white dark:hover:bg-[#A0A0A0] dark:hover:text-[#0A0A0A] rounded-lg",
        ghost:
          "hover:bg-[#FAFAF8] dark:hover:bg-[#151515] text-[#1A1A1A] dark:text-[#F5F5F5] rounded-lg",
        link: "text-[#8B7355] dark:text-[#A89580] underline-offset-4 hover:underline hover:opacity-70",
      },
      size: {
        default: "h-10 px-7 py-3 has-[>svg]:px-5",
        sm: "h-9 px-5 py-2 has-[>svg]:px-3 text-xs",
        lg: "h-12 px-8 py-3.5 has-[>svg]:px-6 text-base",
        icon: "size-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };