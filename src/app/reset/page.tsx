"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { PasswordInput } from "@/features/auth/PasswordInput";

const MIN_PASSWORD = 8;

export default function ResetPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // El link del correo trae el token en el hash. `detectSessionInUrl: true`
  // lo canjea solo, así que acá solo hace falta esperar a que exista sesión.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(Boolean(session));
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit() {
    if (password.length < MIN_PASSWORD || busy) return;
    setBusy(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    router.replace("/");
  }

  if (!ready) return <div className="min-h-dvh bg-void" />;

  if (!hasSession) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-lg font-semibold">Link vencido</h1>
        <p className="max-w-xs text-sm text-muted">
          Este link ya se usó o expiró. Pedí uno nuevo desde la pantalla de
          ingreso.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/")}
          className="mt-2 rounded-xl border border-line px-4 py-2.5 text-sm"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6">
      <h1 className="mb-2 text-lg font-semibold">Nueva contraseña</h1>

      <PasswordInput
        value={password}
        onChange={setPassword}
        onSubmit={submit}
        autoComplete="new-password"
        placeholder="nueva contraseña"
      />

      <button
        type="button"
        onClick={submit}
        disabled={password.length < MIN_PASSWORD || busy || done}
        className="w-full max-w-xs rounded-xl bg-accent px-4 py-3 font-medium text-black disabled:opacity-30"
      >
        {busy ? "…" : "Guardar"}
      </button>

      {password.length > 0 && password.length < MIN_PASSWORD && (
        <p className="text-xs text-muted">Mínimo {MIN_PASSWORD} caracteres</p>
      )}

      {error && <p className="max-w-xs text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
