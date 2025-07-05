import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useTheme } from "@/hooks/ThemeContext"


const buttonVariants = cva(
  "transform duration-500 hover:shadow-md inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: "shadow-sm",
        submit:
          "shadow-sm bg-emerald-900/90 text-white px-3 py-1",
        edit:
          "shadow-sm bg-sky-900 text-white px-3 py-1",
        delete:
          "shadow-sm bg-red-800 text-white px-3 py-1",
        create:
          "shadow-sm bg-indigo-900 text-white px-3 py-1",
        view:
          "shadow-sm bg-stone-600/80 text-white px-3 py-1",
        copy:
          "shadow-sm bg-amber-700/80 text-white px-3 py-1",
        undo:
          "shadow-sm bg-teal-700 text-white px-3 py-1",
        pending:
          "shadow-sm bg-cyan-800 text-white px-3 py-1",
        link: "shadow-sm bg-transparent px-3 py-1",
      },
      size: {
        default: "h-9 px-3 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)


function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"
  const { theme } = useTheme()


  const themeClass =
    variant === "default"
      ? theme === "dark"
        ? "bg-white hover:bg-white/80"
        : "bg-black text-white hover:bg-black/80"
      : ""


  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), themeClass, className)}
      {...props}
    />
  )
}


export { Button, buttonVariants }

