// Skeleton for every screen under a session (register: skeletons, not spinners)
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl animate-pulse px-6 py-10">
      <div className="h-4 w-28 rounded bg-secondary" />
      <div className="mt-3 h-7 w-64 rounded bg-secondary" />
      <div className="mt-2 h-4 w-96 max-w-full rounded bg-secondary" />
      <div className="mt-8 h-40 card-soft" />
      <div className="mt-6 h-24 card-soft" />
    </main>
  );
}
