import { getProfiles } from "@/lib/profiles";

// Sign-in gate: one shared password (real Supabase auth), then pick a profile.
// Knowing the URL is no longer enough — the password is required.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profiles = getProfiles();
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFF7F8] px-6 text-rose-950">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-semibold text-rose-600">
          <span aria-hidden>●</span> Valedictorian Run
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Who&apos;s studying?
        </h1>
        <p className="mt-2 text-sm text-rose-900/70">
          Enter the shared password, then pick your profile.
        </p>

        <form action="/api/profile-login" method="post" className="mt-8">
          <input
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            placeholder="Shared password"
            className="h-11 w-full rounded-xl border border-rose-200 bg-white px-4 text-center text-sm text-rose-950 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
          />
          {error && (
            <p className="mt-3 text-sm text-red-600">
              Wrong password — try again.
            </p>
          )}

          <div className="mt-8 flex items-start justify-center gap-8">
            {profiles.map((p) => (
              <button
                key={p.email}
                name="email"
                value={p.email}
                type="submit"
                className="group flex w-28 cursor-pointer flex-col items-center gap-3"
              >
                <span className="flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-rose-600 to-rose-500 text-3xl font-semibold text-white shadow-[0_10px_30px_-10px_rgba(225,29,72,0.5)] transition duration-200 group-hover:-translate-y-1 group-hover:ring-4 group-hover:ring-rose-300/60 group-active:scale-95">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium text-rose-900/70 transition group-hover:text-rose-950">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </form>

        {profiles.length === 0 && (
          <p className="mt-6 text-sm text-red-600">
            No profiles configured — set the PROFILES env var.
          </p>
        )}
      </div>
    </main>
  );
}
