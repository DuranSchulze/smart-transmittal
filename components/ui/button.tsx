"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-azure/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background aria-invalid:border-coral aria-invalid:ring-2 aria-invalid:ring-coral/20 disabled:pointer-events-none disabled:opacity-50 border border-transparent bg-clip-padding shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 group/button",
  {
    variants: {
      variant: {
        default: "bg-royal text-white hover:bg-royal/90 shadow-card",
        outline: "border border-royal/60 bg-white text-royal hover:bg-royal/5 aria-expanded:bg-royal/5 aria-expanded:text-royal",
        secondary: "bg-fog text-graphite hover:bg-fog/70 aria-expanded:bg-fog aria-expanded:text-graphite",
        ghost: "text-caption hover:bg-fog hover:text-graphite aria-expanded:bg-fog aria-expanded:text-graphite",
        destructive: "bg-coral/10 text-coral hover:bg-coral/20 focus-visible:ring-coral/30 aria-invalid:ring-coral/20",
        link: "text-royal underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 rounded-full px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-full px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-full px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
        lg: "h-10 gap-1.5 rounded-full px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9 rounded-full",
        "icon-xs": "size-6 rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-10 rounded-full",
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
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
