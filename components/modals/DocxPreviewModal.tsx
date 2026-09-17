"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface DocxPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  html: string;
}

export const DocxPreviewModal: React.FC<DocxPreviewModalProps> = ({
  isOpen,
  onClose,
  html,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl h-[92vh] rounded-2xl shadow-feature flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden border border-divider">
        <div className="p-5 px-6 border-b border-divider bg-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-royal rounded-lg flex items-center justify-center text-white shadow-glow-sm">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-ink">
                Word Rendering
              </h3>
              <p className="text-xs font-medium text-helper">
                Live DOCX Layout Simulation
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon-lg"
            className="rounded-full text-helper hover:text-ink"
          >
            ✕
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-fog flex justify-center custom-scrollbar">
          <div className="bg-white w-full max-w-[8.5in] shadow-card p-16 min-h-full font-sans text-ink preview-content border border-divider rounded-lg">
            {html ? (
              <div
                className="animate-in fade-in duration-700"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-helper gap-4">
                <div className="w-12 h-12 border-4 border-royal border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">
                  Generating Live Preview...
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 px-6 border-t border-divider bg-white flex justify-between items-center shrink-0">
          <p className="text-xs font-medium text-helper">
            Standard A4/Letter Layout
          </p>
          <Button
            onClick={onClose}
            className="px-8 py-2.5 rounded-full font-medium shadow-card"
          >
            Close View
          </Button>
        </div>
      </div>
      <style>{`
        .preview-content { font-family: 'Arial', sans-serif; font-size: 10pt; color: #020520; line-height: 1.4; }
        .preview-content h1 { font-size: 1.5rem; font-weight: bold; margin-bottom: 2rem; text-align: center; color: #020520; }
        .preview-content table { width: 100% !important; border-collapse: collapse !important; margin-bottom: 1.5rem !important; table-layout: fixed; }
        .preview-content td { border: 1px solid #e2e8f0; padding: 6px 10px; font-size: 9pt; vertical-align: top; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};
