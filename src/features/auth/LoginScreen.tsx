"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center">
        <p className="text-muted">
          Te enviamos un link a <span className="text-ink">{email}</span>. Ábrelo
          desde este mismo dispositivo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
      <h1 className="text-lg font-semibold">¿Qué haría Cristiano Ronaldo?</h1>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full max-w-xs rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent"
      />
      <button
        onClick={send}
        disabled={!email.includes("@") || sending}
        className="w-full max-w-xs rounded-xl bg-accent px-4 py-3 font-medium text-black disabled:opacity-30"
      >
        {sending ? "Enviando…" : "Entrar"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
