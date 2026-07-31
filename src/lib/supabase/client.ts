import { createClient } from "@supabase/supabase-js";

// Cliente único de navegador. No usamos @supabase/ssr porque ningún
// Server Component necesita la sesión: la app es 100% cliente.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
    },
  },
);
