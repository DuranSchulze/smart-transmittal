import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { WorkspaceNavigation } from "./WorkspaceNavigation"

const progress = {
  files: true,
  sender: true,
  project: false,
  recipient: false,
  delivery: false,
  signoff: false,
  review: false,
}

describe("WorkspaceNavigation", () => {
  it("puts Files first and opens the selected section", () => {
    const onSectionChange = vi.fn()
    render(
      <WorkspaceNavigation
        activeSection="files"
        onSectionChange={onSectionChange}
        progress={progress}
      />,
    )

    const files = screen.getByRole("button", { name: "Files" })
    expect(files.getAttribute("aria-current")).toBe("page")

    fireEvent.click(screen.getByRole("button", { name: "Project" }))
    expect(onSectionChange).toHaveBeenCalledWith("project")
  })

  it("supports a compact icon-only state", () => {
    const onToggleMinimized = vi.fn()
    render(
      <WorkspaceNavigation
        activeSection="files"
        onSectionChange={vi.fn()}
        progress={progress}
        isMinimized
        onToggleMinimized={onToggleMinimized}
      />,
    )

    const compactFilesButton = screen
      .getAllByRole("button", { name: "Files" })
      .find((button) => button.getAttribute("title") === "Files")

    expect(compactFilesButton).toBeDefined()
    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }))
    expect(onToggleMinimized).toHaveBeenCalledOnce()
  })

})
