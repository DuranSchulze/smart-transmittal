"use client"

import {
  Building2,
  Check,
  ClipboardCheck,
  FileStack,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Settings2,
  UserRound,
} from "lucide-react"
import type { WorkspaceProgress, WorkspaceSection } from "../../../types"

const sections = [
  { key: "files", label: "Files", icon: FolderOpen },
  { key: "sender", label: "Sender", icon: Building2 },
  { key: "project", label: "Project", icon: FileStack },
  { key: "recipient", label: "Recipient", icon: UserRound },
  { key: "delivery", label: "Delivery", icon: Send },
  { key: "signoff", label: "Sign-off", icon: Settings2 },
  { key: "review", label: "Review", icon: ClipboardCheck },
] satisfies Array<{
  key: WorkspaceSection
  label: string
  icon: typeof FolderOpen
}>

type WorkspaceNavigationProps = {
  activeSection: WorkspaceSection
  onSectionChange: (section: WorkspaceSection) => void
  progress: WorkspaceProgress
  isMinimized?: boolean
  onToggleMinimized?: () => void
}

export function WorkspaceNavigation({
  activeSection,
  onSectionChange,
  progress,
  isMinimized = false,
  onToggleMinimized,
}: WorkspaceNavigationProps) {
  return (
    <nav
      aria-label="Transmittal workspace"
      className={`flex shrink-0 flex-col border-r border-divider bg-white px-2 py-3 transition-[width] duration-200 ease-out ${
        isMinimized ? "w-[68px]" : "w-[84px]"
      }`}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-1.5">
        {sections.map(({ key, label, icon: Icon }) => {
          const active = activeSection === key
          return (
            <button
              key={key}
              type="button"
              data-tour={key === "files" ? "tab-files" : `tab-${key}`}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              title={isMinimized ? label : undefined}
              onClick={() => onSectionChange(key)}
              className={`group relative flex w-full items-center justify-center rounded-xl text-xs font-medium transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] ${
                isMinimized
                  ? "h-11"
                  : "min-h-[58px] flex-col gap-1 px-1.5"
              } ${
                active
                  ? "bg-wash text-royal shadow-card"
                  : "text-helper hover:bg-fog hover:text-caption"
              }`}
            >
              <Icon className="h-[19px] w-[19px] shrink-0" strokeWidth={active ? 2.3 : 1.8} />
              {!isMinimized ? <span>{label}</span> : null}
              {progress[key] ? (
                <span
                  className={`absolute flex items-center justify-center rounded-full ${
                    isMinimized
                      ? "right-1.5 top-1.5 h-2 w-2"
                      : "right-1.5 top-1.5 h-3.5 w-3.5"
                  } ${
                    active ? "bg-mint text-white" : "bg-mint/15 text-mint"
                  }`}
                  aria-hidden="true"
                  title={`${label} complete`}
                >
                  {!isMinimized ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {onToggleMinimized ? (
        <button
          type="button"
          onClick={onToggleMinimized}
          className="mt-3 hidden h-10 w-full shrink-0 items-center justify-center rounded-xl border border-divider text-helper transition-colors hover:bg-fog lg:flex"
          aria-label={isMinimized ? "Expand sidebar" : "Minimize sidebar"}
          title={isMinimized ? "Expand sidebar" : "Minimize sidebar"}
        >
          {isMinimized ? (
            <PanelLeftOpen className="h-[18px] w-[18px]" />
          ) : (
            <PanelLeftClose className="h-[18px] w-[18px]" />
          )}
        </button>
      ) : null}
    </nav>
  )
}
