import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0b] gap-6 px-4">
      <Link
        href="/"
        className="font-playfair text-2xl font-bold tracking-tight text-[#f0ede8] cursor-pointer hover:opacity-80 transition-opacity"
      >
        Whisp<span className="text-[#d4a03a] italic">r</span>
      </Link>
      <SignUp
        routing="hash"
        forceRedirectUrl="/dashboard"
        signInUrl="/sign-in"
      />
      <Link
        href="/"
        className="text-xs tracking-[0.06em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors"
      >
        ← Back to home
      </Link>
    </div>
  );
}
