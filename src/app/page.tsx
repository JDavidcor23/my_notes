import { Header } from "@/components/Header";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <Header />
      <div className="flex-1 px-4 py-6 text-muted">
        Todavía no hay nada. Escribí algo.
      </div>
    </main>
  );
}
