import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground  border-input flex w-full rounded-md border px-3 py-1 shadow-xs",
        className
      )}
      {...props}
    />
  )
}

export { Input }
