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
    <header className="border-b border-slate-200/80 px-6 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-brand-600">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        </div>
        {action}
      </div>
    </header>
  )
}
