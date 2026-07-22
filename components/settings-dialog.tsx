"use client";

import { useEffect, useId, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Check, CircleAlert, Eye, EyeOff, X } from "lucide-react";
import { pressable, shouldSkipEntrance } from "@/lib/motion";
import { initialsOf, updateAccount, type Account } from "@/lib/account-store";
import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "h-11 w-full rounded-lg border border-input bg-foreground/[0.03] px-3.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive/60";

const PRIMARY_PILL =
  "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-semibold text-background shadow-sm transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-foreground";

const SECONDARY_PILL =
  "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border bg-foreground/[0.04] px-5 text-[14px] font-semibold transition-colors hover:bg-foreground/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-foreground/[0.04]";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ProfileDraft = {
  name: string;
  email: string;
  phone: string;
  photo: string | null;
};

type PasswordDraft = { current: string; next: string; confirm: string };

type FieldKey =
  | "name"
  | "email"
  | "phone"
  | "photo"
  | "current"
  | "next"
  | "confirm";

type Errors = Partial<Record<FieldKey, string>>;

function validateProfileField(key: "name" | "email" | "phone", value: string) {
  const v = value.trim();
  if (key === "name" && !v) return "Enter your name.";
  if (key === "email") {
    if (!v) return "Enter your email address.";
    if (!EMAIL_PATTERN.test(v))
      return "Enter a valid email address, like name@school.edu.";
  }
  if (key === "phone" && v) {
    const digits = v.replace(/\D/g, "");
    if (!/^[+\d\s().-]+$/.test(v) || digits.length < 7 || digits.length > 15)
      return "Enter a valid phone number, like (408) 555-0117.";
  }
  return undefined;
}

function validatePasswordField(
  key: "current" | "next" | "confirm",
  pw: PasswordDraft,
) {
  if (key === "current" && !pw.current) return "Enter your current password.";
  if (key === "next") {
    if (!pw.next) return "Enter a new password.";
    if (pw.next.length < 8) return "Use at least 8 characters.";
  }
  if (key === "confirm") {
    if (!pw.confirm) return "Re-enter the new password.";
    if (pw.confirm !== pw.next) return "Passwords don't match.";
  }
  return undefined;
}

function ErrorLine({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p
      id={id}
      role="alert"
      className="flex items-start gap-1.5 text-[12px] font-medium text-destructive-ink"
    >
      <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
      {error}
    </p>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  optional?: boolean;
  type?: string;
  autoComplete?: string;
  inputMode?: "tel" | "email" | "text";
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  onChange: (value: string) => void;
  onBlur: () => void;
};

function TextField({
  id,
  label,
  value,
  error,
  optional,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  inputRef,
  onChange,
  onBlur,
}: TextFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium">
        {label}
        {optional && (
          <span className="ml-1.5 font-normal text-muted-foreground">
            (optional)
          </span>
        )}
      </label>
      <input
        ref={inputRef}
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={INPUT_CLASS}
      />
      <ErrorLine id={`${id}-error`} error={error} />
    </div>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  autoComplete: string;
  inputRef?: React.Ref<HTMLInputElement>;
  onChange: (value: string) => void;
  onBlur: () => void;
};

function PasswordField({
  id,
  label,
  value,
  error,
  autoComplete,
  inputRef,
  onChange,
  onBlur,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type={show ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={cn(INPUT_CLASS, "pr-12")}
        />
        <button
          type="button"
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={show}
          onClick={() => setShow((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {show ? (
            <EyeOff aria-hidden className="size-4" />
          ) : (
            <Eye aria-hidden className="size-4" />
          )}
        </button>
      </div>
      <ErrorLine id={`${id}-error`} error={error} />
    </div>
  );
}

type SettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  /* The effective account (session seed + saved overrides), owned by the
     ProfileMenu so both surfaces stay in sync. */
  account: Account;
  /* Storage namespace for this sign-in (accountUserKey of the session). */
  userKey: string;
};

export function SettingsDialog({
  open,
  onClose,
  account,
  userKey,
}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const currentRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  /* Generation token for the async photo decode: a decode started in an
     earlier open session or superseded by a newer file must not commit. */
  const photoJobRef = useRef(0);
  const uid = useId();

  const [draft, setDraft] = useState<ProfileDraft>({
    name: account.name,
    email: account.email,
    phone: account.phone,
    photo: account.photo,
  });
  const [pw, setPw] = useState<PasswordDraft>({
    current: "",
    next: "",
    confirm: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const profileDirty =
    draft.name !== account.name ||
    draft.email !== account.email ||
    draft.phone !== account.phone ||
    draft.photo !== account.photo;
  const passwordDirty = Boolean(pw.current || pw.next || pw.confirm);
  const dirty = profileDirty || passwordDirty;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setDraft({
        name: account.name,
        email: account.email,
        phone: account.phone,
        photo: account.photo,
      });
      setPw({ current: "", next: "", confirm: "" });
      setErrors({});
      setProfileSaved(false);
      setPasswordSaved(false);
      setPhotoNote(null);
      setConfirmingDiscard(false);
      photoJobRef.current += 1;
      dialog.showModal();
      requestAnimationFrame(() => nameRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, account]);

  /* Wheel/touch over the backdrop still scrolls the page behind the
     modal; lock it while open. */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useGSAP(() => {
    if (!open || !dialogRef.current || shouldSkipEntrance()) return;
    gsap.from(dialogRef.current, {
      opacity: 0,
      y: 10,
      scale: 0.98,
      duration: 0.22,
      ease: "power3.out",
      clearProps: "opacity,transform",
      overwrite: "auto",
    });
  }, [open]);

  useEffect(() => {
    if (confirmingDiscard) keepEditingRef.current?.focus();
  }, [confirmingDiscard]);

  const setField = (key: "name" | "email" | "phone", value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setProfileSaved(false);
    setConfirmingDiscard(false);
  };

  const setPwField = (key: "current" | "next" | "confirm", value: string) => {
    setPw((p) => ({ ...p, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setPasswordSaved(false);
    setConfirmingDiscard(false);
  };

  const blurField = (key: "name" | "email" | "phone") =>
    setErrors((e) => ({ ...e, [key]: validateProfileField(key, draft[key]) }));

  const blurPwField = (key: "current" | "next" | "confirm") => {
    /* Skip the emptiness complaint while the section is untouched;
       required errors surface on submit. */
    if (!pw[key]) return;
    setErrors((e) => ({ ...e, [key]: validatePasswordField(key, pw) }));
  };

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((er) => ({
        ...er,
        photo: "That file isn't an image. Choose a JPG, PNG, or WebP.",
      }));
      return;
    }
    const job = ++photoJobRef.current;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (job !== photoJobRef.current) return;
      if (!img.width || !img.height) {
        setErrors((er) => ({
          ...er,
          photo: "Couldn't read that image. Try a different file.",
        }));
        return;
      }
      /* Downscale to a 256px cover-cropped square so the stored data
         URL stays small enough for localStorage. White fill first: JPEG
         has no alpha, and without it transparency flattens to black. */
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, size, size);
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        setDraft((d) => ({ ...d, photo: canvas.toDataURL("image/jpeg", 0.85) }));
        setErrors((er) => ({ ...er, photo: undefined }));
        setProfileSaved(false);
        setPhotoNote(null);
        setConfirmingDiscard(false);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      if (job !== photoJobRef.current) return;
      setErrors((er) => ({
        ...er,
        photo: "Couldn't read that image. Try a different file.",
      }));
    };
    img.src = url;
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileDirty) return;
    const nextErrors: Errors = {
      name: validateProfileField("name", draft.name),
      email: validateProfileField("email", draft.email),
      phone: validateProfileField("phone", draft.phone),
    };
    setErrors((er) => ({ ...er, ...nextErrors }));
    const firstInvalid = (
      [
        ["name", nameRef],
        ["email", emailRef],
        ["phone", phoneRef],
      ] as const
    ).find(([key]) => nextErrors[key]);
    if (firstInvalid) {
      firstInvalid[1].current?.focus();
      return;
    }
    updateAccount(userKey, {
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      photo: draft.photo,
    });
    setDraft((d) => ({
      ...d,
      name: d.name.trim(),
      email: d.email.trim(),
      phone: d.phone.trim(),
    }));
    setPhotoNote(null);
    setProfileSaved(true);
  };

  const savePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordDirty) return;
    const nextErrors: Errors = {
      current: validatePasswordField("current", pw),
      next: validatePasswordField("next", pw),
      confirm: validatePasswordField("confirm", pw),
    };
    setErrors((er) => ({ ...er, ...nextErrors }));
    const firstInvalid = (
      [
        ["current", currentRef],
        ["next", nextRef],
        ["confirm", confirmRef],
      ] as const
    ).find(([key]) => nextErrors[key]);
    if (firstInvalid) {
      firstInvalid[1].current?.focus();
      return;
    }
    /* No auth layer exists yet; verify the current password and persist
       the new one here when the login project is connected. */
    setPw({ current: "", next: "", confirm: "" });
    setPasswordSaved(true);
  };

  /* Close synchronously instead of waiting for the dialog's queued
     "close" event: background/hidden tabs can defer that task
     indefinitely, stranding the parent's open state. The onClose prop
     stays on the dialog for browser-initiated closes; running it twice
     is harmless. */
  const closeDialog = () => {
    setConfirmingDiscard(false);
    dialogRef.current?.close();
    onClose();
  };

  const requestClose = () => {
    if (confirmingDiscard) {
      setConfirmingDiscard(false);
      return;
    }
    if (dirty) {
      setConfirmingDiscard(true);
      return;
    }
    closeDialog();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${uid}-heading`}
      onClose={onClose}
      onCancel={(e) => {
        if (confirmingDiscard) {
          e.preventDefault();
          setConfirmingDiscard(false);
          closeButtonRef.current?.focus();
        } else if (dirty) {
          e.preventDefault();
          setConfirmingDiscard(true);
        }
      }}
      onMouseDown={(e) => {
        pressStartedOnBackdrop.current = e.target === dialogRef.current;
      }}
      onClick={(e) => {
        if (pressStartedOnBackdrop.current && e.target === dialogRef.current)
          requestClose();
        pressStartedOnBackdrop.current = false;
      }}
      className="m-auto max-h-[min(88dvh,46rem)] w-[min(92vw,520px)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-[var(--shadow-card-hover)] backdrop:bg-scrim backdrop:backdrop-blur-md"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id={`${uid}-heading`}
              className="text-[18px] font-semibold tracking-tight"
            >
              Account settings
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              Your name and photo appear on filed POCR reports.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={requestClose}
            aria-label="Close settings"
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        <form onSubmit={saveProfile} noValidate className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[13px] font-medium">Profile photo</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-foreground/[0.06]">
                {draft.photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- data-URL avatar; next/image can't optimize it */
                  <img
                    src={draft.photo}
                    alt="Profile photo preview"
                    className="size-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="text-[18px] font-semibold text-foreground/80"
                  >
                    {initialsOf(draft.name || account.name)}
                  </span>
                )}
              </span>
              <label className="inline-flex h-11 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full border border-border bg-foreground/[0.04] px-5 text-[14px] font-semibold transition-colors hover:bg-foreground/[0.08] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-card">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  aria-label="Upload photo"
                  className="sr-only"
                  onChange={onPhotoChange}
                />
                Upload photo
              </label>
              {draft.photo && (
                <button
                  type="button"
                  onClick={() => {
                    /* This button unmounts on activation; move focus to a
                       surviving control first (retry-button precedent). */
                    fileInputRef.current?.focus();
                    setDraft((d) => ({ ...d, photo: null }));
                    setProfileSaved(false);
                    setPhotoNote("Photo removed. Save changes to apply.");
                    setConfirmingDiscard(false);
                  }}
                  className="inline-flex h-11 cursor-pointer items-center rounded-lg px-3 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Remove
                </button>
              )}
            </div>
            <ErrorLine id={`${uid}-photo-error`} error={errors.photo} />
          </div>

          <TextField
            id={`${uid}-name`}
            label="Full name"
            value={draft.name}
            error={errors.name}
            autoComplete="name"
            inputRef={nameRef}
            onChange={(v) => setField("name", v)}
            onBlur={() => blurField("name")}
          />
          <TextField
            id={`${uid}-email`}
            label="Email"
            type="email"
            inputMode="email"
            value={draft.email}
            error={errors.email}
            autoComplete="email"
            inputRef={emailRef}
            onChange={(v) => setField("email", v)}
            onBlur={() => blurField("email")}
          />
          <TextField
            id={`${uid}-phone`}
            label="Phone number"
            type="tel"
            inputMode="tel"
            optional
            placeholder="(408) 555-0117"
            value={draft.phone}
            error={errors.phone}
            autoComplete="tel"
            inputRef={phoneRef}
            onChange={(v) => setField("phone", v)}
            onBlur={() => blurField("phone")}
          />

          <div className="flex items-center gap-3 pt-1.5">
            <button
              type="submit"
              aria-disabled={!profileDirty}
              {...pressable()}
              className={PRIMARY_PILL}
            >
              Save changes
            </button>
            <p role="status" className="text-[13px] text-muted-foreground">
              {profileSaved ? (
                <span className="inline-flex items-center gap-1.5">
                  <Check aria-hidden className="size-4 text-success" />
                  Changes saved
                </span>
              ) : (
                photoNote
              )}
            </p>
          </div>
        </form>

        <div className="mt-7 border-t border-border pt-6">
          <h3 className="text-[14px] font-semibold tracking-tight">
            Change password
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Use at least 8 characters. You&apos;ll stay signed in on this
            device.
          </p>
          <form onSubmit={savePassword} noValidate className="mt-4 space-y-4">
            <PasswordField
              id={`${uid}-current`}
              label="Current password"
              value={pw.current}
              error={errors.current}
              autoComplete="current-password"
              inputRef={currentRef}
              onChange={(v) => setPwField("current", v)}
              onBlur={() => blurPwField("current")}
            />
            <PasswordField
              id={`${uid}-next`}
              label="New password"
              value={pw.next}
              error={errors.next}
              autoComplete="new-password"
              inputRef={nextRef}
              onChange={(v) => setPwField("next", v)}
              onBlur={() => blurPwField("next")}
            />
            <PasswordField
              id={`${uid}-confirm`}
              label="Confirm new password"
              value={pw.confirm}
              error={errors.confirm}
              autoComplete="new-password"
              inputRef={confirmRef}
              onChange={(v) => setPwField("confirm", v)}
              onBlur={() => blurPwField("confirm")}
            />
            <div className="flex items-center gap-3 pt-1.5">
              <button
                type="submit"
                aria-disabled={!passwordDirty}
                {...pressable()}
                className={SECONDARY_PILL}
              >
                Update password
              </button>
              <p role="status" className="text-[13px] text-muted-foreground">
                {passwordSaved && (
                  <span className="inline-flex items-center gap-1.5">
                    <Check aria-hidden className="size-4 text-success" />
                    Password updated
                  </span>
                )}
              </p>
            </div>
          </form>
        </div>

        {confirmingDiscard && (
          <div
            role="group"
            aria-labelledby={`${uid}-discard-q`}
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-foreground/[0.04] p-4"
          >
            <p id={`${uid}-discard-q`} className="text-[13px] font-medium">
              Discard unsaved changes?
            </p>
            <div className="flex items-center gap-2">
              <button
                ref={keepEditingRef}
                type="button"
                aria-describedby={`${uid}-discard-q`}
                onClick={() => {
                  /* The strip unmounts; park focus on the close button so
                     it never drops to body. */
                  setConfirmingDiscard(false);
                  closeButtonRef.current?.focus();
                }}
                className="inline-flex h-11 cursor-pointer items-center rounded-full border border-border px-5 text-[14px] font-semibold transition-colors hover:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                Keep editing
              </button>
              <button
                type="button"
                aria-describedby={`${uid}-discard-q`}
                onClick={closeDialog}
                className="inline-flex h-11 cursor-pointer items-center rounded-full border border-destructive/40 bg-destructive/[0.08] px-5 text-[14px] font-semibold text-destructive-ink transition-colors hover:bg-destructive/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
