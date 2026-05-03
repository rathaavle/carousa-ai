"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { signIn, signUp } from "@/modules/auth/actions";

type Mode = "login" | "register";

export default function LoginForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isLogin = mode === "login";

  function toggleMode() {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const action = isLogin ? signIn : signUp;
      const errorMessage = await action(email, password);
      if (errorMessage) {
        setError(errorMessage);
      }
    });
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            {isLogin ? "Masuk" : "Daftar"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLogin
              ? "Masuk ke akun Carousa-AI Anda"
              : "Buat akun Carousa-AI baru"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
              disabled={isPending}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
              disabled={isPending}
            />
          </div>

          {/* Error message */}
          {error && (
            <p
              role="alert"
              className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isPending}
          >
            {isPending
              ? isLogin
                ? "Sedang masuk…"
                : "Sedang mendaftar…"
              : isLogin
                ? "Masuk"
                : "Daftar"}
          </Button>
        </form>

        {/* Toggle mode */}
        <div className="mt-5 text-center text-sm text-muted-foreground">
          {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
          <button
            type="button"
            onClick={toggleMode}
            className="font-medium text-foreground underline-offset-4 hover:underline focus:outline-none"
            disabled={isPending}
          >
            {isLogin ? "Daftar sekarang" : "Masuk"}
          </button>
        </div>
      </div>
    </div>
  );
}
