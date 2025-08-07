import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"


const buttonVariants = cva(
  "inline-block",
  {
    variants: {
      variant: {
        default: "",
        general:
          "bg-slate-600 text-white",
        submit:
          "bg-emerald-900/90 text-white",
        edit:
          "bg-sky-900 text-white",
        delete:
          "bg-red-800 text-white",
        create:
          "bg-indigo-900 text-white",
        view:
          "bg-stone-600/80 text-white",
        copy:
          "bg-amber-700/80 text-white",
        undo:
          "bg-teal-700 text-white",
        pending:
          "bg-cyan-800 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)


function Button({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"
  const themeClass =
    variant === "default" ? "" : ""

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant }), themeClass, className)}
      {...props}
    />
  )
}


export { Button, buttonVariants }

