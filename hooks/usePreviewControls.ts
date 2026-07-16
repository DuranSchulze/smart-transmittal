"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ZOOM_STEPS } from "../components/main/PreviewToolbar"

export const DEFAULT_COLUMN_WIDTHS = {
  qty: 55,
  noOfItems: 65,
  documentNumber: 130,
  description: 260,
  remarks: 150,
} as const

export type ColumnWidthField = keyof typeof DEFAULT_COLUMN_WIDTHS

const COLUMN_ORDER: ColumnWidthField[] = [
  "noOfItems",
  "qty",
  "documentNumber",
  "description",
  "remarks",
]

const LIMITS: Record<ColumnWidthField, { min: number; max: number }> = {
  noOfItems: { min: 55, max: 140 },
  qty: { min: 55, max: 120 },
  documentNumber: { min: 100, max: 260 },
  description: { min: 160, max: 360 },
  remarks: { min: 120, max: 260 },
}

export function usePreviewControls(showPreview: boolean) {
  const [columnWidths, setColumnWidths] = useState({ ...DEFAULT_COLUMN_WIDTHS })
  const [zoomPercent, setZoomPercent] = useState(100)
  const [autoFitZoom, setAutoFitZoom] = useState(100)
  const [isManualZoom, setIsManualZoom] = useState(false)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const resize = () => {
      if (!previewContainerRef.current) return
      const containerWidth = previewContainerRef.current.offsetWidth
      const fit =
        containerWidth < 850
          ? Math.max(25, Math.min(100, Math.round(((containerWidth - 32) / 850) * 100)))
          : 100
      setAutoFitZoom(fit)
      if (!isManualZoom) setZoomPercent(fit)
    }
    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [isManualZoom, showPreview])

  const zoomIn = useCallback(() => {
    setIsManualZoom(true)
    setZoomPercent((current) => ZOOM_STEPS.find((step) => step > current) ?? current)
  }, [])

  const zoomOut = useCallback(() => {
    setIsManualZoom(true)
    setZoomPercent(
      (current) => [...ZOOM_STEPS].reverse().find((step) => step < current) ?? current,
    )
  }, [])

  const resetZoom = useCallback(() => {
    setIsManualZoom(false)
    setZoomPercent(autoFitZoom)
  }, [autoFitZoom])

  const setZoom = useCallback((percent: number) => {
    setIsManualZoom(true)
    setZoomPercent(percent)
  }, [])

  const resizeDivider = useCallback(
    (leftField: ColumnWidthField, deltaX: number) => {
      setColumnWidths((current) => {
        const leftIndex = COLUMN_ORDER.indexOf(leftField)
        const rightField = COLUMN_ORDER[leftIndex + 1]
        if (!rightField) return current

        const leftCurrent = current[leftField]
        const rightCurrent = current[rightField]
        const maxGrowLeft = Math.min(
          LIMITS[leftField].max - leftCurrent,
          rightCurrent - LIMITS[rightField].min,
        )
        const maxShrinkLeft = Math.min(
          leftCurrent - LIMITS[leftField].min,
          LIMITS[rightField].max - rightCurrent,
        )
        const delta =
          deltaX > 0
            ? Math.min(deltaX, maxGrowLeft)
            : -Math.min(-deltaX, maxShrinkLeft)
        if (!Number.isFinite(delta) || Math.abs(delta) < 0.01) return current
        return {
          ...current,
          [leftField]: Math.round(leftCurrent + delta),
          [rightField]: Math.round(rightCurrent - delta),
        }
      })
    },
    [],
  )

  const resetColumnWidths = useCallback(
    () => setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS }),
    [],
  )

  return {
    columnWidths,
    zoomPercent,
    previewScale: zoomPercent / 100,
    previewContainerRef,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    resizeDivider,
    resetColumnWidths,
  }
}
