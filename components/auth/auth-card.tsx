"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Check, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react"

import { cn } from "@/lib/utils"
import { providers } from "@/components/auth/brand-icons"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 6

type FieldErrors = { email?: string; password?: string }
type Status = "idle" | "loading" | "success"

export function AuthCard({
  enabledProviders,
}: {
  enabledProviders: Record<string, boolean>
}) {
  const router = useRouter()
  const rootRef = React.useRef<HTMLDivElement>(null)
  const emailRef = React.useRef<HTMLInputElement>(null)
  const passwordRef = React.useRef<HTMLInputElement>(null)
  const reducedRef = React.useRef(false)
  const submitTimer = React.useRef<number | undefined>(undefined)

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [remember, setRemember] = React.useState(false)
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | undefined>()
  const [socialNote, setSocialNote] = React.useState<string | undefined>()
  const [status, setStatus] = React.useState<Status>("idle")

  const busy = status === "loading" || status === "success"

  // Staggered entrance. useGSAP is StrictMode-safe + auto-reverts on unmount;
  // the watchdog guarantees content is never left hidden if the ticker throttles.
  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return
      reducedRef.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
      if (reducedRef.current) return

      const items = root.querySelectorAll("[data-reveal]")
      gsap.set(items, { autoAlpha: 0, y: 16 })
      const tween = gsap.to(items, {
        autoAlpha: 1,
        y: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.055,
        delay: 0.1,
      })
      const watchdog = window.setTimeout(() => {
        if (tween.progress() < 1) gsap.set(items, { autoAlpha: 1, y: 0 })
      }, 1600)
      return () => window.clearTimeout(watchdog)
    },
    { scope: rootRef },
  )

  useGSAP(
    () => {
      if (status !== "success" || reducedRef.current) return
      gsap.fromTo(
        "[data-success-check]",
        { scale: 0, rotate: -25 },
        { scale: 1, rotate: 0, duration: 0.5, ease: "back.out(2.2)" },
      )
    },
    { scope: rootRef, dependencies: [status] },
  )

  React.useEffect(() => () => window.clearTimeout(submitTimer.current), [])

  const pressable = (rest = 1.02) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      if (reducedRef.current) return
      gsap.to(e.currentTarget, { scale: rest, duration: 0.22, ease: "power2.out" })
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      if (reducedRef.current) return
      gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: "power2.out" })
    },
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (reducedRef.current) return
      gsap.to(e.currentTarget, { scale: 0.97, duration: 0.12 })
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      if (reducedRef.current) return
      gsap.to(e.currentTarget, { scale: rest, duration: 0.18 })
    },
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => {
      if (reducedRef.current) return
      gsap.to(e.currentTarget, { scale: 1, duration: 0.18 })
    },
  })

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    const mail = email.trim()
    if (!mail) next.email = "Enter your email address."
    else if (!EMAIL_RE.test(mail)) next.email = "That doesn't look like a valid email."
    if (!password) next.password = "Enter your password."
    else if (password.length < MIN_PASSWORD)
      next.password = `Use at least ${MIN_PASSWORD} characters.`
    return next
  }

  function handleSocial(id: string, name: string) {
    if (busy) return
    if (!enabledProviders[id]) {
      setSocialNote(`${name} sign-in isn't configured yet. Add its keys to .env.local.`)
      return
    }
    setSocialNote(undefined)
    void signIn(id, { callbackUrl: "/dashboard" })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    const next = validate()
    setErrors(next)
    if (next.email) {
      emailRef.current?.focus()
      return
    }
    if (next.password) {
      passwordRef.current?.focus()
      return
    }
    setFormError(undefined)
    setStatus("loading")
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      })
      if (!res || res.error) {
        setStatus("idle")
        setFormError("Invalid email or password.")
        passwordRef.current?.focus()
        return
      }
      setStatus("success")
      submitTimer.current = window.setTimeout(() => {
        router.push("/dashboard")
        router.refresh()
      }, 700)
    } catch {
      setStatus("idle")
      setFormError("Something went wrong. Please try again.")
    }
  }

  const socialBtn =
    "relative flex h-11 w-full items-center justify-center rounded-xl bg-foreground text-[14px] font-medium text-background shadow-sm transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"

  const fieldClass = (invalid?: boolean) =>
    cn(
      "h-11 w-full rounded-xl border bg-foreground/[0.04] pl-10 pr-3 text-[14px] text-foreground placeholder:text-muted-foreground/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-60",
      invalid
        ? "border-destructive focus-visible:ring-destructive/50"
        : "border-border focus-visible:border-foreground/25",
    )

  let submitContent: React.ReactNode = "Sign in"
  if (status === "loading") {
    submitContent = (
      <>
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Signing in…
      </>
    )
  } else if (status === "success") {
    submitContent = (
      <>
        <Check data-success-check className="size-4" strokeWidth={3} aria-hidden />
        Signed in
      </>
    )
  }

  return (
    <div
      ref={rootRef}
      className="relative z-10 mx-auto flex w-full max-w-[400px] flex-col items-center px-6 text-center"
    >
      {/* soft spotlight behind the heading, dark theme only */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-80px] hidden h-[260px] w-[380px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.18),transparent_62%)] blur-2xl dark:block"
      />

      <div data-reveal className="flex flex-col items-center">
        <h1 className="text-[30px] font-semibold tracking-tight text-foreground sm:text-[34px]">
          Welcome back!
        </h1>
        <p className="mt-2 max-w-[34ch] text-sm text-muted-foreground">
          Sign in to access your dashboard, settings, and projects.
        </p>
      </div>

      <div className="mt-8 flex w-full flex-col gap-2.5">
        {providers.map(({ id, name, Logo }) => (
          <button
            key={id}
            type="button"
            data-reveal
            disabled={busy}
            onClick={() => handleSocial(id, name)}
            {...pressable(1.015)}
            className={socialBtn}
          >
            <Logo className="absolute left-3 top-1/2 -translate-y-1/2" />
            Continue with {name}
          </button>
        ))}
      </div>

      {socialNote && (
        <p role="alert" className="mt-2.5 w-full text-center text-[12px] text-muted-foreground">
          {socialNote}
        </p>
      )}

      <div data-reveal className="my-5 flex w-full items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          or
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-4 text-left">
        <div data-reveal className="flex flex-col gap-1.5">
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 size-[17px] -translate-y-1/2 text-muted-foreground/70"
              aria-hidden
            />
            <input
              id="email"
              ref={emailRef}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Email address"
              aria-label="Email address"
              disabled={busy}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
                if (formError) setFormError(undefined)
              }}
              className={fieldClass(!!errors.email)}
            />
          </div>
          {errors.email && (
            <p id="email-error" role="alert" className="text-[11px] text-destructive-ink">
              {errors.email}
            </p>
          )}
        </div>

        <div data-reveal className="flex flex-col gap-1.5">
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 size-[17px] -translate-y-1/2 text-muted-foreground/70"
              aria-hidden
            />
            <input
              id="password"
              ref={passwordRef}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Password"
              aria-label="Password"
              disabled={busy}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors((p) => ({ ...p, password: undefined }))
                if (formError) setFormError(undefined)
              }}
              className={cn(fieldClass(!!errors.password), "pr-10")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              disabled={busy}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {showPassword ? (
                <Eye className="size-4" aria-hidden />
              ) : (
                <EyeOff className="size-4" aria-hidden />
              )}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" role="alert" className="text-[11px] text-destructive-ink">
              {errors.password}
            </p>
          )}
        </div>

        <div data-reveal className="flex items-center justify-between">
          <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] text-muted-foreground">
            <span className="relative flex size-[18px] items-center justify-center">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={busy}
                className="peer size-[18px] cursor-pointer appearance-none rounded-[5px] border border-border bg-foreground/[0.04] transition-colors checked:border-foreground checked:bg-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Check
                className="pointer-events-none absolute size-3 scale-0 text-background transition-transform peer-checked:scale-100"
                strokeWidth={3.5}
                aria-hidden
              />
            </span>
            Remember for 30 days
          </label>
          <a
            href="#"
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Forgot Password?
          </a>
        </div>

        {formError && (
          <p role="alert" className="text-center text-[12px] font-medium text-destructive-ink">
            {formError}
          </p>
        )}

        <button
          type="submit"
          data-reveal
          disabled={busy}
          {...pressable(1.02)}
          className={cn(
            "mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-default",
            status === "success"
              ? "bg-success text-success-foreground hover:bg-success"
              : "bg-foreground text-background hover:bg-foreground/90",
          )}
        >
          {submitContent}
        </button>
      </form>

      <p aria-live="polite" className="sr-only">
        {status === "success" ? "Signed in successfully." : ""}
      </p>

      <p data-reveal className="mt-6 text-sm text-muted-foreground">
        No account?{" "}
        <a href="#" className="font-medium text-foreground hover:underline">
          Create an account
        </a>
      </p>
    </div>
  )
}
