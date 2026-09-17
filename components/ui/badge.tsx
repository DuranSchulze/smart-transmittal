import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "h-5 gap-1 rounded-full border border-transparent px-2 py-0.5 text-xs font-medium transition-colors has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3! inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-azure focus-visible:ring-azure/25 focus-visible:ring-2 aria-invalid:border-coral aria-invalid:ring-coral/20 overflow-hidden group/badge",
  {
    variants: {
      variant: {
        default: "bg-royal/10 text-royal [a]:hover:bg-royal/20",
        secondary: "bg-fog text-caption [a]:hover:bg-fog/70",
        destructive: "bg-coral/10 [a]:hover:bg-coral/20 focus-visible:ring-coral/25 text-coral",
        outline: "border-divider text-caption [a]:hover:bg-fog [a]:hover:text-caption",
        ghost: "text-helper hover:bg-fog hover:text-caption",
        link: "text-royal underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ className, variant })),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
