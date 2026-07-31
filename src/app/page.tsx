import { Header } from "@/components/Header";
import { AuthGate } from "@/features/auth/AuthGate";
import { Composer } from "@/features/entries/Composer";
import { EntryList } from "@/features/entries/EntryList";

export default function Home() {
  return (
    <AuthGate>
      {/* h-dvh + columna: el historial scrollea al medio y el composer queda
          clavado abajo. Sin position:fixed, así el teclado del celular empuja
          el layout en vez de taparlo. El padding de arriba evita meterse
          debajo del notch en modo standalone. */}
      <div className="mx-auto flex h-dvh max-w-2xl flex-col pt-[env(safe-area-inset-top)]">
        <Header />
        <EntryList />
        <Composer />
      </div>
    </AuthGate>
  );
}
