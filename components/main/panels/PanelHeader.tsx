import type { ReactNode } from "react"

type PanelHeaderProps = {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}

export function PanelHeader({
  eyebrow = "Workspace",
  title,
  description,
  action,
}: PanelHeaderProps) {
  return (
    <header className="border-b border-divider px-6 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-royal">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">
            {title}
          </h2>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-helper">
            {description}
          </p>
        </div>
        {action}
      </div>
    </header>
  )
}
