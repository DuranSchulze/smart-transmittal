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
    <header className="border-b border-divider px-4 py-4 sm:px-6 sm:py-5">
      <p className="text-xs font-medium text-royal">{eyebrow}</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-lg font-semibold tracking-tight text-ink sm:text-xl">
          {title}
        </h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-helper">
        {description}
      </p>
    </header>
  )
}
