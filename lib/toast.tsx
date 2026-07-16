"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react"

export type ToastType = "success" | "error" | "info"

type ToastOptions = {
  duration?: number
}

type ToastItem = {
  id: number
  message: string
  type: ToastType
}

type ToastApi = {
  success: (message: string, options?: ToastOptions) => void
  error: (message: string, options?: ToastOptions) => void
  info: (message: string, options?: ToastOptions) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer))
      timers.current.clear()
    },
    [],
  )

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const show = useCallback(
    (type: ToastType, message: string, options?: ToastOptions) => {
      const normalizedMessage = message.trim()
      if (!normalizedMessage) return

      const id = nextId.current++
      setItems((current) => [
        ...current.slice(-3),
        { id, message: normalizedMessage, type },
      ])

      const duration = options?.duration ?? (type === "error" ? 7_000 : 4_000)
      if (duration > 0) {
        timers.current.set(id, setTimeout(() => dismiss(id), duration))
      }
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, options) => show("success", message, options),
      error: (message, options) => show("error", message, options),
      info: (message, options) => show("info", message, options),
      dismiss,
    }),
    [dismiss, show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-5 z-[160] flex w-[min(92vw,390px)] flex-col gap-2"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((item) => {
          const isError = item.type === "error"
          const isSuccess = item.type === "success"
          const Icon = isError ? AlertCircle : isSuccess ? CheckCircle2 : Info
          return (
            <div
              key={item.id}
              role={isError ? "alert" : "status"}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-sm ${
                isError
                  ? "border-red-200 bg-red-50/95 text-red-700"
                  : isSuccess
                    ? "border-emerald-200 bg-white/95 text-emerald-700"
                    : "border-blue-200 bg-white/95 text-blue-700"
              }`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="min-w-0 flex-1 text-xs leading-relaxed text-slate-700">
                {item.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext)
  if (!value) {
    throw new Error("useToast must be used inside ToastProvider")
  }
  return value
}
