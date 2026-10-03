"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "register") {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Registration failed");
        return;
      }
    }

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="max-w-sm mx-auto bg-white p-6 rounded-lg border">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setMode("signin")}
          className={mode === "signin" ? "font-semibold" : "text-gray-400"}
        >
          Sign in
        </button>
        <button
          onClick={() => setMode("register")}
          className={mode === "register" ? "font-semibold" : "text-gray-400"}
        >
          Create account
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "register" && (
          <input
            placeholder="Name"
            className="w-full border rounded px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        )}
        <input
          placeholder="Email"
          type="email"
          className="w-full border rounded px-3 py-2"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          placeholder="Password"
          type="password"
          className="w-full border rounded px-3 py-2"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="w-full bg-black text-white rounded py-2">
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      <div className="mt-4">
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full border rounded py-2"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
