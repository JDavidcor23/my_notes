import { Header } from "@/components/Header";
import { AuthGate } from "@/features/auth/AuthGate";
import { Composer } from "@/features/entries/Composer";
import { EntryList } from "@/features/entries/EntryList";

export default function Home() {
  return (
    <AuthGate>
      {/* h-dvh + columna: header arriba, historial scrollea al medio,
          composer clavado abajo. Sin position:fixed, así el teclado
          del celular empuja el layout en vez de taparlo. */}
      <div className="mx-auto flex h-dvh max-w-2xl flex-col">
        <Header />
        <EntryList />
        <Composer />
      </div>
    </AuthGate>
  );
}
