import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AutoSaveIndicator } from "./AutoSaveIndicator"

const renderIndicator = (
  overrides: Partial<React.ComponentProps<typeof AutoSaveIndicator>> = {},
) => {
  const onRetry = vi.fn()
  render(
    <AutoSaveIndicator
      hasUnsavedChanges={false}
      isSaving={false}
      lastSavedAt={null}
      saveError={null}
      isDraft
      onRetry={onRetry}
      {...overrides}
    />,
  )
  return onRetry
}

describe("AutoSaveIndicator", () => {
  it("always shows that autosave is ready before the first edit", () => {
    renderIndicator()
    expect(screen.getByText("Autosave ready")).toBeTruthy()
  })

  it("shows pending, saving, and saved states clearly", () => {
    const { rerender } = render(
      <AutoSaveIndicator
        hasUnsavedChanges
        isSaving={false}
        lastSavedAt={null}
        saveError={null}
        isDraft
        onRetry={() => undefined}
      />,
    )
    expect(screen.getByText("Changes pending")).toBeTruthy()

    rerender(
      <AutoSaveIndicator
        hasUnsavedChanges
        isSaving
        lastSavedAt={null}
        saveError={null}
        isDraft
        onRetry={() => undefined}
      />,
    )
    expect(screen.getByText("Saving draft…")).toBeTruthy()

    rerender(
      <AutoSaveIndicator
        hasUnsavedChanges={false}
        isSaving={false}
        lastSavedAt={new Date("2026-07-16T08:00:00.000Z")}
        saveError={null}
        isDraft
        onRetry={() => undefined}
      />,
    )
    expect(screen.getByText("Saved automatically")).toBeTruthy()
  })

  it("shows a retry action when cloud autosave fails", () => {
    const onRetry = renderIndicator({ saveError: "Network unavailable" })
    expect(screen.getByText("Autosave failed")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
