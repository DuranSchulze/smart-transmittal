import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-16 w-full rounded-xl border border-divider bg-white px-3 py-2 text-sm text-graphite shadow-none outline-none transition-[color,box-shadow] placeholder:text-helper focus-visible:border-azure focus-visible:ring-2 focus-visible:ring-azure/25 aria-invalid:border-coral aria-invalid:ring-2 aria-invalid:ring-coral/20 flex field-sizing-content disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
