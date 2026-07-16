"use client"

import type { RefObject } from "react"
import type {
  AppData,
  FooterNotes,
  ReceivedBy,
  Signatories,
  TransmittalItem,
} from "../../types"
import { ErrorBoundary } from "../common/ErrorBoundary"
import { TransmittalTemplate } from "../transmittal/TransmittalTemplate"
import { PreviewToolbar } from "./PreviewToolbar"
import {
  DEFAULT_COLUMN_WIDTHS,
  type ColumnWidthField,
} from "../../hooks/usePreviewControls"

type PreviewPanelProps = {
  showPreview: boolean
  containerRef: RefObject<HTMLDivElement | null>
  zoomPercent: number
  previewScale: number
  data: AppData
  hasFormData: boolean
  isDocumentProcessing: boolean
  isGeneratingPdf: boolean
  columnWidths: Record<ColumnWidthField, number>
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  onResetColumnWidths: () => void
  onZoomSet: (percent: number) => void
  onUpdateItem: (
    index: number,
    field: keyof TransmittalItem,
    value: string,
  ) => void
  onAdjustItemQty: (index: number, delta: number) => void
  onRemoveItem: (index: number) => void
  onMoveItem: (index: number, direction: "up" | "down") => void
  onReorderItems: (fromIndex: number, toIndex: number) => void
  onAddItem: () => void
  onBulkAdd: () => void
  onUpdateSignatory: (field: keyof Signatories, value: string) => void
  onUpdateReceivedBy: (field: keyof ReceivedBy, value: string) => void
  onUpdateFooter: (field: keyof FooterNotes, value: string) => void
  onUpdateNotes: (value: string) => void
  onDropFiles: (files: File[]) => void
  onResizeDivider: (field: ColumnWidthField, deltaX: number) => void
}

const fallback = (
  <div className="flex flex-1 items-center justify-center bg-slate-100 p-8 text-sm text-slate-600">
    The preview could not be rendered. Your form data is still safe in the editor.
  </div>
)

export function PreviewPanel(props: PreviewPanelProps) {
  return (
    <ErrorBoundary fallback={fallback} resetKey={props.data.project.transmittalNumber}>
      <div
        data-tour="preview-panel"
        ref={props.containerRef}
        className={`${props.showPreview ? "flex" : "hidden"} lg:flex flex-1 h-full overflow-y-auto overflow-x-hidden bg-slate-200 custom-scrollbar w-full absolute inset-0 lg:static z-10 flex-col items-center`}
      >
        <PreviewToolbar
          zoomPercent={props.zoomPercent}
          onZoomIn={props.onZoomIn}
          onZoomOut={props.onZoomOut}
          onZoomReset={props.onZoomReset}
          onResetColumnWidths={props.onResetColumnWidths}
          onZoomSet={props.onZoomSet}
          transmittalNumber={props.data.project.transmittalNumber}
          showSaveNotice={props.hasFormData}
        />
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col items-center p-4 lg:p-8 pt-0">
          <div
            className={`transition-all duration-300 ease-out origin-top shadow-[0_40px_100px_rgba(0,0,0,0.15)] rounded-sm shrink-0 ${props.isDocumentProcessing ? "opacity-60" : "opacity-100"}`}
            style={{
              transform: `scale(${props.previewScale})`,
              width: "816px",
              marginBottom: "200px",
            }}
          >
            <div
              id="print-container"
              className="bg-white min-h-[1056px]"
              aria-busy={props.isDocumentProcessing}
            >
              <TransmittalTemplate
                data={props.data}
                onUpdateItem={props.onUpdateItem}
                onAdjustItemQty={props.onAdjustItemQty}
                onRemoveItem={props.onRemoveItem}
                onMoveItem={props.onMoveItem}
                onReorderItems={props.onReorderItems}
                onAddItem={props.onAddItem}
                onBulkAdd={props.onBulkAdd}
                onUpdateSignatory={props.onUpdateSignatory}
                onUpdateReceivedBy={props.onUpdateReceivedBy}
                onUpdateFooter={props.onUpdateFooter}
                onUpdateNotes={props.onUpdateNotes}
                onDropFiles={props.onDropFiles}
                isGeneratingPdf={props.isGeneratingPdf}
                columnWidths={
                  props.isGeneratingPdf
                    ? DEFAULT_COLUMN_WIDTHS
                    : props.columnWidths
                }
                onResizeDivider={props.onResizeDivider}
              />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
