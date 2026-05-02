"use client";

import { useState } from "react";
import { SignOutButton } from "@clerk/nextjs";

interface SignOutConfirmProps {
  variant: "nav" | "actions";
}

export default function SignOutConfirm({ variant }: SignOutConfirmProps) {
  const [open, setOpen] = useState(false);

  const triggerClass =
    variant === "nav"
      ? "text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
      : "border border-red-900/30 text-red-400/70 text-xs font-medium tracking-[0.1em] uppercase px-6 py-3 hover:border-red-900/60 hover:text-red-400 transition-all";

  return (
    <>
      <button className={triggerClass} onClick={() => setOpen(true)}>
        Sign out
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#111114] border border-white/[0.08] p-8 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-playfair text-xl font-bold text-[#f0ede8] mb-2">
              Sign out?
            </h2>
            <p className="text-sm text-[#7a7870] leading-relaxed mb-8">
              Are you sure you want to sign out of Whispr?
            </p>
            <div className="flex gap-3">
              <SignOutButton redirectUrl="/">
                <button className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.1em] uppercase px-5 py-3 hover:bg-[#f0c060] transition-all">
                  Yes, sign out
                </button>
              </SignOutButton>
              <button
                className="border border-white/[0.08] text-[#7a7870] text-xs font-medium tracking-[0.1em] uppercase px-5 py-3 hover:text-[#f0ede8] hover:border-white/20 transition-all"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
