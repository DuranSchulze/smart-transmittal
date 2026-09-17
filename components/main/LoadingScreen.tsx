"use client";

import React from "react";

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas font-sans">
      <div className="bg-white border border-divider rounded-2xl shadow-card p-8 text-center">
        <div className="w-12 h-12 border-2 border-royal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-xs font-medium text-helper">
          Loading session
        </p>
      </div>
    </div>
  );
};
