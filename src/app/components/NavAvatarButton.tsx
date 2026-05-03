"use client";

import { useUser } from "@clerk/nextjs";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NavAvatarButton() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
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

  if (!user) return null;

  const firstName = user.firstName ?? "";
  const initial = firstName.charAt(0).toUpperCase() || (user.emailAddresses[0]?.emailAddress.charAt(0).toUpperCase() ?? "?");
  const imageUrl = user.imageUrl;
  const email = user.emailAddresses[0]?.emailAddress ?? "";

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center focus:outline-none"
        aria-label="Account menu"
      >
        {imageUrl ? (
          <img src={imageUrl} alt={firstName} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <span className="w-8 h-8 rounded-full bg-[#d4a03a] text-[#0a0a0b] text-xs font-bold flex items-center justify-center">
            {initial}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-12 right-0 min-w-[220px] bg-[#111114] border border-white/[0.06] rounded-sm shadow-xl p-5 z-50">
          <p className="text-[#7a7870] text-xs text-center truncate">{email}</p>
          {imageUrl ? (
            <img src={imageUrl} alt={firstName} className="w-14 h-14 rounded-full object-cover mx-auto mt-3" />
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
        </div>
      )}
    </div>
  );
}
