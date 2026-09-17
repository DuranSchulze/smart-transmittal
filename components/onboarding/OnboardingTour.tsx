"use client";


import React, { useEffect, useState, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";

export interface TourStepItem {
  id: string;
  label: string;
  shortcut?: string;
  description: string;
  important?: boolean;
  importantNote?: string;
}

export interface TourStep {
  id: string;
  targetSelector: string | null;
  title: string;
  body: string;
  items?: TourStepItem[];
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PopoverPosition {
  top: number;
  left: number;
  placement: "top" | "bottom" | "left" | "right" | "center";
}

interface OnboardingTourProps {
  steps: TourStep[];
  isOpen: boolean;
  currentStep: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
}

const PADDING = 16;
const POPOVER_WIDTH = 380;
const POPOVER_WIDTH_ITEMS = 480;
const POPOVER_APPROX_HEIGHT = 270;
const POPOVER_ITEMS_APPROX_HEIGHT = 520;

function getTargetRect(selector: string | null): TargetRect | null {
  if (!selector) return null;
  try {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  } catch {
    return null;
  }
}

function computePopoverPosition(
  target: TargetRect | null,
  vpWidth: number,
  vpHeight: number,
  popoverWidth: number,
  popoverHeight: number,
): PopoverPosition {
  if (!target) {
    return {
      top: Math.max(PADDING, vpHeight / 2 - popoverHeight / 2),
      left: Math.max(PADDING, vpWidth / 2 - popoverWidth / 2),
      placement: "center",
    };
  }

  const spaceBelow = vpHeight - (target.top + target.height);
  const spaceAbove = target.top;
  const spaceRight = vpWidth - (target.left + target.width);
  const spaceLeft = target.left;

  let top: number;
  let left: number;
  let placement: PopoverPosition["placement"];

  if (spaceBelow >= popoverHeight + PADDING) {
    top = target.top + target.height + PADDING;
    left = Math.min(
      Math.max(target.left, PADDING),
      vpWidth - popoverWidth - PADDING,
    );
    placement = "bottom";
  } else if (spaceAbove >= popoverHeight + PADDING) {
    top = target.top - popoverHeight - PADDING;
    left = Math.min(
      Math.max(target.left, PADDING),
      vpWidth - popoverWidth - PADDING,
    );
    placement = "top";
  } else if (spaceRight >= popoverWidth + PADDING) {
    top = Math.min(
      Math.max(target.top, PADDING),
      vpHeight - popoverHeight - PADDING,
    );
    left = target.left + target.width + PADDING;
    placement = "right";
  } else if (spaceLeft >= popoverWidth + PADDING) {
    top = Math.min(
      Math.max(target.top, PADDING),
      vpHeight - popoverHeight - PADDING,
    );
    left = target.left - popoverWidth - PADDING;
    placement = "left";
  } else {
    top = Math.max(PADDING, vpHeight / 2 - popoverHeight / 2);
    left = Math.max(PADDING, vpWidth / 2 - popoverWidth / 2);
    placement = "center";
  }

  return { top, left, placement };
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  steps,
  isOpen,
  currentStep,
  onNext,
  onBack,
  onSkip,
  onFinish,
}) => {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPosition>({
    top: 0,
    left: 0,
    placement: "center",
  });
  const [vpSize, setVpSize] = useState({ w: 0, h: 0 });

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const hasItems = Boolean(step?.items?.length);
  const popoverWidth = hasItems ? POPOVER_WIDTH_ITEMS : POPOVER_WIDTH;
  const isCentered = !step?.targetSelector || !targetRect;

  const recalculate = useCallback(() => {
    if (!step) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const stepHasItems = Boolean(step.items?.length);
    const desiredWidth = stepHasItems ? POPOVER_WIDTH_ITEMS : POPOVER_WIDTH;
    const desiredHeight = Math.min(
      stepHasItems ? POPOVER_ITEMS_APPROX_HEIGHT : POPOVER_APPROX_HEIGHT,
      h - PADDING * 2,
    );
    setVpSize({ w, h });
    const rect = getTargetRect(step.targetSelector);
    setTargetRect(rect);
    setPopoverPos(
      computePopoverPosition(rect, w, h, desiredWidth, desiredHeight),
    );
  }, [step]);

  useEffect(() => {
    if (!isOpen || !step) return;

    const scrollAndRecalc = () => {
      if (step.targetSelector) {
        try {
          const el = document.querySelector(step.targetSelector);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        } catch {}
      }
      setTimeout(recalculate, 150);
    };

    scrollAndRecalc();

    window.addEventListener("resize", recalculate);
    return () => window.removeEventListener("resize", recalculate);
  }, [isOpen, currentStep, step, recalculate]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
      if (e.key === "ArrowRight" && !isLastStep) onNext();
      if (e.key === "ArrowLeft" && currentStep > 0) onBack();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, isLastStep, currentStep, onNext, onBack, onSkip]);

  if (!isOpen || !step) return null;

  const highlightPad = 6;
  const highlightTop = targetRect ? targetRect.top - highlightPad : 0;
  const highlightLeft = targetRect ? targetRect.left - highlightPad : 0;
  const highlightWidth = targetRect ? targetRect.width + highlightPad * 2 : 0;
  const highlightHeight = targetRect ? targetRect.height + highlightPad * 2 : 0;

  const shadowSpread = 9999;

  return (
    <div className="fixed inset-0 z-[9000] pointer-events-none">
      {isCentered ? (
        <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm pointer-events-auto transition-colors duration-300 motion-reduce:transition-none" />
      ) : (
        <div
          className="absolute pointer-events-auto transition-[top,left,width,height,border-radius,box-shadow] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
          style={{
            top: highlightTop,
            left: highlightLeft,
            width: highlightWidth,
            height: highlightHeight,
            borderRadius: 6,
            boxShadow: `0 0 0 ${shadowSpread}px rgba(2, 6, 23, 0.7)`,
          }}
        />
      )}

      {!isCentered && targetRect && (
        <div
          className="absolute z-[9001] rounded-lg border-2 border-royal/40 pointer-events-none transition-[top,left,width,height,box-shadow] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
          style={{
            top: highlightTop,
            left: highlightLeft,
            width: highlightWidth,
            height: highlightHeight,
            boxShadow: "0 0 0 4px rgba(129, 140, 248, 0.2)",
          }}
        />
      )}

      <div
        className="absolute z-[9002] pointer-events-auto transition-[top,left] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
        style={{
          top: isCentered
            ? Math.max(
                PADDING,
                vpSize.h / 2 -
                  (hasItems
                    ? Math.min(POPOVER_ITEMS_APPROX_HEIGHT, vpSize.h - PADDING * 2)
                    : POPOVER_APPROX_HEIGHT) /
                    2,
              )
            : popoverPos.top,
          left: isCentered
            ? Math.max(PADDING, vpSize.w / 2 - popoverWidth / 2)
            : popoverPos.left,
          width: popoverWidth,
          maxWidth: `calc(100vw - ${PADDING * 2}px)`,
        }}
      >
        <div
          key={step.id}
          className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-divider bg-white shadow-feature animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:animate-none"
        >
          <div className="flex shrink-0 items-start justify-between gap-4 bg-wash px-6 py-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-royal text-white shadow-glow-sm">
                <HelpCircle className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="mb-1 text-xs font-medium text-helper">
                  Workspace tour · Step {currentStep + 1}
                </p>
                <h3 className="break-words text-sm font-semibold leading-snug text-ink">
                {step.title}
                </h3>
              </div>
            </div>
            <button
              onClick={onSkip}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-helper transition-[background-color,color,transform] duration-150 hover:bg-white hover:text-ink active:scale-95 motion-reduce:transition-none"
              title="Skip tour"
              aria-label="Close workspace tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {hasItems ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {step.body && (
                <p className="mb-4 break-words text-sm leading-6 text-caption">
                  {step.body}
                </p>
              )}
              <div className="space-y-2">
                {step.items!.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 rounded-lg px-4 py-3 transition-[background-color,transform] duration-150 hover:-translate-y-px motion-reduce:transform-none motion-reduce:transition-none ${
                      item.important
                        ? "bg-amber-100 hover:bg-amber-200/80"
                        : "bg-fog hover:bg-wash"
                    }`}
                  >
                    {item.important && (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`break-words text-sm font-semibold ${
                            item.important ? "text-amber-950" : "text-ink"
                          }`}
                        >
                          {item.label}
                        </span>
                        {item.important && (
                          <span className="rounded-full bg-amber-700 px-2 py-1 text-xs font-medium text-white">
                            Recommended
                          </span>
                        )}
                        {item.shortcut && (
                          <span className="rounded-full bg-white px-2 py-1 font-mono text-xs font-medium text-caption shadow-sm">
                            {item.shortcut}
                          </span>
                        )}
                      </div>
                      <p
                        className={`mt-1 break-words text-xs leading-5 ${
                          item.important ? "text-amber-900" : "text-caption"
                        }`}
                      >
                        {item.description}
                      </p>
                      {item.important && item.importantNote && (
                        <p className="mt-2 break-words text-xs font-medium leading-5 text-amber-800">
                          {item.importantNote}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <p className="break-words text-sm font-medium leading-relaxed text-caption">
                {step.body}
              </p>
            </div>
          )}

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-fog px-6 py-4">
            <span className="text-xs font-medium text-helper">
              {currentStep + 1} / {steps.length}
            </span>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={onBack}
                  className="flex h-9 items-center gap-1 rounded-full bg-fog px-3 text-xs font-medium text-caption transition-[background-color,transform] duration-150 hover:bg-wash hover:text-royal active:scale-[0.97] motion-reduce:transition-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}
              <button
                onClick={onSkip}
                className="h-9 rounded-full px-3 text-xs font-medium text-helper transition-[background-color,color,transform] duration-150 hover:bg-wash hover:text-ink active:scale-[0.97] motion-reduce:transition-none"
              >
                Skip
              </button>
              {isLastStep ? (
                <button
                  onClick={onFinish}
                  className="flex h-9 items-center gap-1 rounded-full bg-royal px-4 text-xs font-medium text-white shadow-glow-sm transition-[background-color,transform,box-shadow] duration-150 hover:bg-royal/90 active:scale-[0.97] motion-reduce:transition-none"
                >
                  Finish
                </button>
              ) : (
                <button
                  onClick={onNext}
                  className="flex h-9 items-center gap-1 rounded-full bg-royal px-4 text-xs font-medium text-white shadow-glow-sm transition-[background-color,transform,box-shadow] duration-150 hover:bg-royal/90 active:scale-[0.97] motion-reduce:transition-none"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-1 bg-fog px-6 pb-4">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${
                  idx === currentStep
                    ? "scale-y-125 bg-royal"
                    : idx < currentStep
                      ? "bg-royal/40"
                      : "bg-divider"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
