"use client";

import PageGuard from "@/components/tec-bii/PageGuard";

export default function AtenaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageGuard />
      <div className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0]">
        {children}
      </div>
    </>
  );
}
