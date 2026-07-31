"use client";

import { useState } from "react";

export function PasswordInput({
  value,
  onChange,
  onSubmit,
  autoComplete,
  placeholder = "contraseña",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
}) {
  const [reveal, setReveal] = useState(false);

  return (
    <div className="relative w-full max-w-xs">
      <input
        type={reveal ? "text" : "password"}
        // El navegador y el llavero del celular guardan esto: se escribe una
        // vez y después es un toque.
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
        className="w-full rounded-xl border border-line bg-surface py-3 pr-12 pl-4 outline-none focus:border-accent"
      />
      <button
        type="button"
        onClick={() => setReveal((v) => !v)}
        aria-label={reveal ? "Ocultar contraseña" : "Ver contraseña"}
        aria-pressed={reveal}
        className="absolute top-1/2 right-1 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted"
      >
        {reveal ? (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.2A9.6 9.6 0 0112 5c5 0 9 4.5 9 7a12 12 0 01-2.4 3.4M6.2 6.6C3.9 8.1 3 10.3 3 12c0 2.5 4 7 9 7 1.4 0 2.7-.35 3.8-.9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M3 12c0-2.5 4-7 9-7s9 4.5 9 7-4 7-9 7-9-4.5-9-7z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        )}
      </button>
    </div>
  );
}
