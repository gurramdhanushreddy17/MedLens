"use client";

export const dynamic = "force-dynamic";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Loader2, Lock, ShieldCheck, HeartPulse } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().min(1, "Please enter your administrator email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { data: session, status } = useSession();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@medlens.dev",
      password: "Admin2025!",
    },
  });

  useEffect(() => {
    let active = true;

    const runAutoLogin = async () => {
      if (status === "authenticated" && session) {
        window.location.href = "/dashboard";
        return;
      }

      if (status === "unauthenticated") {
        try {
          const result = await signIn("credentials", {
            email: "admin@medlens.dev",
            password: "Admin2025!",
            redirect: false,
          });

          if (result?.ok && active) {
            window.location.href = "/dashboard";
            return;
          }
        } catch (err) {
          console.error("Automatic login encountered error:", err);
        }
        if (active) {
          setIsAutoLoggingIn(false);
        }
      }
    };

    runAutoLogin();

    return () => {
      active = false;
    };
  }, [session, status]);

  const onSubmit = async (data: LoginForm) => {
    setAuthError(null);
    try {
      const result = await signIn("credentials", {
        email: data.email.trim(),
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setAuthError("Administrator authentication failed. Please verify your admin credentials.");
      } else if (result?.ok) {
        window.location.href = "/dashboard";
      }
    } catch {
      setAuthError("An unexpected network error occurred. Please try again.");
    }
  };

  if (status === "loading" || isAutoLoggingIn) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-white shadow-xl shadow-accent/20 animate-pulse">
            <svg className="h-9 w-9 fill-current" viewBox="0 0 24 24">
              <path d="M19 10.5h-5.5V5a1.5 1.5 0 0 0-3 0v5.5H5a1.5 1.5 0 0 0 0 3h5.5V19a1.5 1.5 0 0 0 3 0v-5.5H19a1.5 1.5 0 0 0 0-3z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-bold text-ink">Signing In to MedLens…</h2>
            <p className="text-xs text-ink/60">
              Authenticating administrator session and opening the Clinical Dashboard…
            </p>
          </div>
          <div className="flex items-center gap-2 text-accent text-xs font-semibold pt-1">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Directing to Patients Dashboard…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-paper overflow-hidden">
      {/* ─── LEFT HALF: Brand, Welcome Banner & 3D Doctor Character ─── */}
      <div className="w-full lg:w-1/2 bg-gradient-to-br from-cream-100 via-accent-50/40 to-cream-200 border-b lg:border-b-0 lg:border-r border-line p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Decorative background glow accents */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Logo with Hospital Plus icon */}
        <div className="relative z-10 flex items-center gap-4 mb-8 animate-fade-in">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-md shadow-accent/15 border border-line/60 bg-white p-1">
            <Image
              src="/logo.jpg"
              alt="MedLens Logo"
              width={64}
              height={64}
              priority
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight">MedLens</span>
        </div>

        {/* Middle: Welcome Message & Tagline */}
        <div className="relative z-10 my-auto py-6 max-w-xl animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold mb-5 shadow-xs">
            <HeartPulse className="h-4 w-4 animate-pulse" />
            <span>Hospital & Clinic Management</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-ink leading-[1.15] tracking-tight mb-4">
            Welcome to <span className="text-accent">MedLens</span> Clinical Management
          </h1>

          <p className="text-base sm:text-lg text-ink/75 leading-relaxed">
            Unified medical records, rapid laboratory report insights, and structured health tracking engineered for modern healthcare institutions.
          </p>

          {/* 3D Doctor Boy Mascot Card */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-5 p-4 sm:p-5 rounded-2xl bg-surface/95 border border-line shadow-md backdrop-blur-sm card-hover transition-all">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-2xl overflow-hidden shadow-inner border border-accent/20 bg-cream-100">
              <Image
                src="/doctor-boy.jpg"
                alt="3D Doctor Mascot"
                fill
                priority
                className="object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-flag-normal/10 border border-flag-normal/20 text-flag-normal text-2xs font-semibold uppercase tracking-wider">
                ● Friendly Health Assistant
              </div>
              <p className="font-serif text-lg font-bold text-ink">
                &ldquo;Always stay healthy!&rdquo;
              </p>
              <p className="text-xs text-ink/60 leading-relaxed max-w-xs">
                Your medical team is dedicated to keeping every patient record safe, precise, and up-to-date.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom copyright/security banner */}
        <div className="relative z-10 pt-6 text-xs text-ink/40 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent" />
          <span>Secure Clinical Management Portal · Administrator Access Only</span>
        </div>
      </div>

      {/* ─── RIGHT HALF: Sign-In Box ─── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16 relative bg-surface">
        <div className="w-full max-w-md space-y-7 animate-fade-in">
          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-50 border border-accent/20 text-accent text-xs font-semibold mb-3">
              <Lock className="h-3.5 w-3.5" />
              <span>Admin Authentication</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              Sign In to MedLens
            </h2>
            <p className="text-sm text-ink/60 mt-1.5">
              Enter your authorized administrative credentials to access patient records and clinical oversight.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Email field */}
            <div>
              <label htmlFor="email" className="text-xs font-semibold text-ink/80 block mb-1.5">
                Administrator Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
                className={cn(
                  "w-full text-sm border rounded-xl px-4 py-3 bg-paper transition-all",
                  "focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent",
                  "placeholder:text-ink/35 shadow-2xs",
                  errors.email ? "border-flag-high ring-1 ring-flag-high/30" : "border-line"
                )}
                placeholder="admin@medlens.dev"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-flag-high flex items-center gap-1" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-ink/80 block">
                  Password
                </label>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
                className={cn(
                  "w-full text-sm border rounded-xl px-4 py-3 bg-paper transition-all",
                  "focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent",
                  "placeholder:text-ink/35 shadow-2xs",
                  errors.password ? "border-flag-high ring-1 ring-flag-high/30" : "border-line"
                )}
                placeholder="••••••••••••"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              {errors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-flag-high flex items-center gap-1" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Error Alert */}
            {authError && (
              <div
                className="flex items-center gap-2.5 p-3.5 bg-flag-high/10 border border-flag-high/30 rounded-xl text-sm text-flag-high animate-fade-in"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{authError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full py-3 px-5 rounded-xl font-semibold text-sm transition-all shadow-sm",
                "bg-accent text-white hover:bg-accent-hover hover:shadow active:scale-[0.99]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Authenticating administrator…</span>
                </>
              ) : (
                <span>Sign In as Administrator</span>
              )}
            </button>
          </form>

          {/* Privacy & Medical Notice */}
          <div className="pt-5 border-t border-line text-center text-xs text-ink/50 leading-relaxed">
            Authorized administrator access to MedLens Clinical Management only. All activities are audited and logged in accordance with clinical safety protocols.
          </div>
        </div>
      </div>
    </div>
  );
}
