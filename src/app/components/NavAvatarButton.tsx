"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function NavAvatarButton() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  useEffect(() => { setMounted(true); }, []);

  if (!user) return null;

  const firstName = user.firstName ?? "";
  const initial = firstName.charAt(0).toUpperCase() || (user.emailAddresses[0]?.emailAddress.charAt(0).toUpperCase() ?? "?");
  const imageUrl = user.imageUrl;
  const email = user.emailAddresses[0]?.emailAddress ?? "";

  return (
    <div className="relative">
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center focus:outline-none"
        aria-label="Account menu"
      >
        {imageUrl ? (
          <Image src={imageUrl} alt={firstName} className="w-8 h-8 rounded-full object-cover" width={32} height={32} />
        ) : (
          <span className="w-8 h-8 rounded-full bg-[#d4a03a] text-[#0a0a0b] text-xs font-bold flex items-center justify-center">
            {initial}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-12 right-0 z-50 min-w-[220px] bg-[#111114] border border-white/[0.06] rounded-sm shadow-xl p-5">
          <p className="text-[#7a7870] text-xs text-center truncate">{email}</p>
          {imageUrl ? (
            <Image src={imageUrl} alt={firstName} className="w-14 h-14 rounded-full object-cover mx-auto mt-3" width={56} height={56} />
          ) : (
            <div className="w-14 h-14 bg-[#d4a03a] text-[#0a0a0b] font-bold text-lg flex items-center justify-center rounded-full mx-auto mt-3">
              {initial}
            </div>
          )}
          <p className="text-[#f0ede8] text-sm font-medium text-center mt-2">Hi, {firstName}</p>
          <button
            onClick={() => router.push("/dashboard/account")}
            className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium uppercase tracking-[0.1em] w-full py-2.5 mt-4 hover:bg-[#f0c060] transition-colors"
          >
            Go to Account
          </button>
          <button
            onClick={() => { setShowConfirm(true); setOpen(false); }}
            className="border border-white/[0.12] text-[#7a7870] text-xs font-medium uppercase tracking-[0.1em] w-full py-2.5 mt-2 hover:text-[#f0ede8] hover:border-white/30 transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>

    {showConfirm && mounted && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-[#111114] border border-white/[0.06] p-8 w-full max-w-sm mx-4">
          <p className="text-[#f0ede8] text-sm font-medium mb-2">Sign out of Whispr?</p>
          <p className="text-[#7a7870] text-xs mb-6">You will be returned to the home page.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="border border-white/[0.12] text-[#7a7870] px-5 py-2.5 text-xs uppercase tracking-[0.1em] hover:text-[#f0ede8] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => signOut({ redirectUrl: "/" })}
              className="bg-[#d4a03a] text-[#0a0a0b] px-5 py-2.5 text-xs uppercase tracking-[0.1em] hover:bg-[#f0c060] transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </div>
  );
}
