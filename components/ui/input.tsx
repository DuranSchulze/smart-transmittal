import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-xl border border-divider bg-white px-3 py-1 text-sm text-graphite shadow-none outline-none transition-[color,box-shadow] placeholder:text-helper focus-visible:border-azure focus-visible:ring-2 focus-visible:ring-azure/25 aria-invalid:border-coral aria-invalid:ring-2 aria-invalid:ring-coral/20 file:h-7 file:text-sm file:font-medium file:text-graphite file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
