import { act, renderHook } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { useFileProcessing } from "./useFileProcessing"

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

it("rejects image files even if a caller includes image MIME types", async () => {
  const process = vi.fn()
  const { result } = renderHook(() => useFileProcessing(process, ["image/*", "application/pdf"]))
  await act(async () => {
    expect(await result.current.processFiles([
      new File(["image"], "scan.png", { type: "image/png" }),
      new File(["image"], "scan.jpg", { type: "application/pdf" }),
    ])).toEqual([])
  })
  expect(process).not.toHaveBeenCalled()
})

it("processes files sequentially without a fixed delay and reports each result", async () => {
  vi.useFakeTimers()
  const events: string[] = []
  vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(function (this: FileReader) {
    Object.defineProperty(this, "result", { value: "data:application/pdf;base64,dGVzdA==", configurable: true })
    this.onload?.call(this, new ProgressEvent("load") as ProgressEvent<FileReader>)
  })
  const process = vi.fn(async (_content: string, _mime: string, name: string) => {
    events.push(`start:${name}`)
    await Promise.resolve()
    events.push(`end:${name}`)
    return name
  })
  const { result } = renderHook(() => useFileProcessing(process))
  let results: string[] = []
  await act(async () => {
    results = await result.current.processFiles([
      new File(["a"], "a.pdf", { type: "application/pdf" }),
      new File(["b"], "b.pdf", { type: "application/pdf" }),
    ], name => events.push(`show:${name}`))
  })
  expect(results).toEqual(["a.pdf", "b.pdf"])
  expect(events).toEqual([
    "start:a.pdf", "end:a.pdf", "show:a.pdf",
    "start:b.pdf", "end:b.pdf", "show:b.pdf",
  ])
  expect(result.current.progress).toEqual({ current: 2, total: 2 })
  expect(result.current.isProcessing).toBe(false)
  expect(vi.getTimerCount()).toBe(0)
})
