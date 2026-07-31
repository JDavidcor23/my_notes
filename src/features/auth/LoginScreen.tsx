"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { PasswordInput } from "./PasswordInput";

const MIN_PASSWORD = 8;

export function LoginScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = email.includes("@") && password.length >= MIN_PASSWORD;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    if (mode === "login") {
      // Sin redirect y sin correo: manda credenciales y recibe la sesión.
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) setError("Email o contraseña incorrectos");
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    setBusy(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Con la confirmación por correo APAGADA, signUp devuelve sesión al toque.
    // Si no viene sesión, la confirmación sigue prendida en el proyecto: se
    // avisa en vez de dejar la pantalla colgada esperando algo que no pasa.
    if (!data.session) {
      setError(
        "Falta apagar la confirmación por correo en Supabase (Authentication → Providers → Email → Confirm email).",
      );
    }
  }

  async function requestReset() {
    if (!email.includes("@")) {
      setError("Escribí tu email primero");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);

    // El origin se resuelve solo: en local apunta a localhost, en producción
    // al dominio de Vercel. Las dos URLs tienen que estar en la lista de
    // Redirect URLs de Supabase, exactas y sin comodines.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset`,
    });
    setBusy(false);

    if (error) setError(error.message);
    else setNotice("Te enviamos un link para cambiar la contraseña.");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6">
      <h1 className="mb-2 text-lg font-semibold">my notes</h1>

      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full max-w-xs rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent"
      />

      <PasswordInput
        value={password}
        onChange={setPassword}
        onSubmit={submit}
        autoComplete={mode === "login" ? "current-password" : "new-password"}
      />

      <button
        type="button"
        onClick={submit}
        disabled={!valid || busy}
        className="w-full max-w-xs rounded-xl bg-accent px-4 py-3 font-medium text-black disabled:opacity-30"
      >
        {busy ? "…" : mode === "login" ? "Entrar" : "Crear cuenta"}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError(null);
          setNotice(null);
        }}
        className="text-sm text-muted underline-offset-4 hover:underline"
      >
        {mode === "login" ? "Primera vez: crear cuenta" : "Ya tengo cuenta"}
      </button>

      {mode === "login" && (
        <button
          type="button"
          onClick={requestReset}
          disabled={busy}
          className="text-sm text-muted underline-offset-4 hover:underline disabled:opacity-40"
        >
          Olvidé mi contraseña
        </button>
      )}

      {password.length > 0 && password.length < MIN_PASSWORD && (
        <p className="text-xs text-muted">Mínimo {MIN_PASSWORD} caracteres</p>
      )}

      {notice && <p className="max-w-xs text-center text-sm text-accent">{notice}</p>}
      {error && <p className="max-w-xs text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
