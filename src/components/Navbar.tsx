"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="border-b bg-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">
          ✈️ AI Trip Planner
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/">Plan a trip</Link>
          {session ? (
            <>
              <Link href="/dashboard">My trips</Link>
              <button onClick={() => signOut()} className="text-gray-500">
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
