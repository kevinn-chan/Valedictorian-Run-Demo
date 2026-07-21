// Home skeleton — navigation feels instant even before data arrives
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl animate-pulse px-6 py-10">
      <div className="h-7 w-72 rounded bg-secondary" />
      <div className="mt-2 h-4 w-96 max-w-full rounded bg-secondary" />
      <div className="mt-8 h-10 rounded-lg bg-secondary" />
      <div className="mt-8 h-24 card-soft" />
    </main>
  );
}
