import { AuthGate } from "@/features/auth/AuthGate";
import { Composer } from "@/features/entries/Composer";
import { EntryList } from "@/features/entries/EntryList";

export default function Home() {
  return (
    <AuthGate>
      {/* h-dvh + columna: el historial scrollea al medio y el composer queda
          clavado abajo. Sin position:fixed, así el teclado del celular empuja
          el layout en vez de taparlo.
          Sin header: en una app de captura es chrome muerto. El padding de
          arriba es solo para no meterse debajo del notch en modo standalone. */}
      <div className="mx-auto flex h-dvh max-w-2xl flex-col pt-[env(safe-area-inset-top)]">
        <EntryList />
        <Composer />
      </div>
    </AuthGate>
  );
}
