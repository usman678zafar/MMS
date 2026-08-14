"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function PostLoginLoading() {
  return (
    <main dir="ltr" className="flex min-h-svh items-center justify-center bg-[#f7faf8] px-5 py-10 text-left">
      <div className="w-full max-w-md px-6 py-9 text-center sm:px-10 sm:py-11" role="status" aria-live="polite">
        <div className="relative mx-auto h-32 w-32">
          <span className="loading-logo-ring absolute inset-0 rounded-full border-2 border-transparent border-t-primary-700 border-r-primary-200" aria-hidden="true" />
          <div className="absolute inset-3 flex items-center justify-center">
            <Image
              src="/logo-mark.svg"
              alt="Madrasa Management"
              width={82}
              height={82}
              className="h-[5.125rem] w-[5.125rem]"
              priority
            />
          </div>
        </div>
        <h1 className="mt-6 text-xl font-bold text-slate-950 sm:text-2xl">
          Madrasa Management System
        </h1>
        <div className="loading-pulse-dots mt-6 flex items-center justify-center gap-2" aria-label="Loading dashboard">
          <span /><span /><span />
        </div>
      </div>
    </main>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPostLoginLoading, setShowPostLoginLoading] = useState(false);
  const [error, setError] = useState(null);
  const postLoginInProgress = useRef(false);
  const { user, refreshAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !postLoginInProgress.current) {
      router.replace("/");
    }
  }, [user, router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Invalid email or password");
      }

      postLoginInProgress.current = true;
      setShowPostLoginLoading(true);

      const minimumDisplayTime = new Promise((resolve) => {
        window.setTimeout(resolve, 5000);
      });

      await Promise.all([refreshAuth(), minimumDisplayTime]);
      router.replace("/");
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  if (showPostLoginLoading) return <PostLoginLoading />;
  if (user) return null;

  return (
    <main dir="ltr" className="min-h-svh bg-[#f7faf8] text-left lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(420px,0.88fr)]">
      <section className="relative hidden min-h-svh overflow-hidden border-r border-slate-200 lg:block">
        <Image
          src="/images/islamic-courtyard-login.png"
          alt="Sunlit arches surrounding a peaceful mosque courtyard"
          fill
          priority
          sizes="56vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/25" />
        <div className="absolute inset-7 rounded-[2rem] border border-white/30 xl:inset-10" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-12 text-center text-white">
          <Image
            src="/logo-mark-white.svg"
            alt="Madrasa Management"
            width={128}
            height={128}
            className="h-28 w-28 drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)] xl:h-32 xl:w-32"
            priority
          />
          <p className="mt-5 text-sm font-extrabold uppercase tracking-[0.18em] drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)] xl:text-base">
            Madrasa Management System
          </p>
        </div>
      </section>

      <section className="flex min-h-svh items-center justify-center px-5 py-10 sm:px-10 lg:bg-white lg:px-12 xl:px-20">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <Image src="/logo-mark.svg" alt="MMS" width={44} height={44} className="h-11 w-11" priority />
            <div>
              <p className="font-bold text-slate-900">Madrasa Management</p>
              <p className="text-xs text-slate-500">
                Community administration portal
              </p>
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-700">
              Secure staff access
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Welcome back
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Enter your credentials to continue to the management portal.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-700"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
                  placeholder="admin@madrasa.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-slate-400">
            Admin Portal &bull; Authorized personnel only
          </p>
        </div>
      </section>
    </main>
  );
}
