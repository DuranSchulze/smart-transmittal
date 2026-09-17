"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface LoginScreenProps {
  onGoogleSignIn: () => void;
  onDDSSignIn: () => void;
  authNotice?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onGoogleSignIn,
  onDDSSignIn,
  authNotice,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas font-sans">
      {authNotice ? (
        <div className="fixed top-5 left-1/2 z-[120] w-[min(92vw,560px)] -translate-x-1/2 animate-in slide-in-from-top-2 fade-in duration-300">
          <div
            role="alert"
            className="rounded-2xl border border-amber-200 bg-white/95 px-4 py-3 text-left shadow-card backdrop-blur"
          >
            <p className="text-xs font-semibold text-amber-900">
              Session notice
            </p>
            <p className="mt-1 text-xs text-amber-700 leading-relaxed">
              {authNotice}
            </p>
          </div>
        </div>
      ) : null}
      <div className="w-full max-w-lg rounded-3xl border border-divider bg-white p-8 text-center shadow-feature">
        <h1 className="text-2xl font-semibold text-ink">
          Smart Transmittal
        </h1>
        <p className="text-sm text-helper mt-2">
          This is a private system created for the Internal Document Transmittal
          System. Select your organization to sign in.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <p className="text-xs font-medium text-helper">
            Choose your organization
          </p>

          <Button
            onClick={onGoogleSignIn}
            className="w-full px-5 py-3.5 rounded-full bg-royal text-sm font-medium text-white shadow-card transition-all hover:bg-royal/90"
          >
            FilePino — Sign in with Google
          </Button>

          <Button
            onClick={onDDSSignIn}
            className="w-full px-5 py-3.5 rounded-full border border-royal/60 bg-white text-sm font-medium text-royal shadow-card transition-all hover:bg-royal/5"
          >
            Duran &amp; Duran-Schulze — Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  );
};
