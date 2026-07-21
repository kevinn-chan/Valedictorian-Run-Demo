import { getProfiles } from "@/lib/profiles";

// Profile picker — the whole sign-in. Clicking a profile signs you in
// server-side; no emails, no passwords. Private-by-link, by design.
export default function LoginPage() {
  const profiles = getProfiles();

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
          Your course materials, compiled into a study system.
        </p>

        <div className="mt-12 flex items-start justify-center gap-8">
          {profiles.map((p) => (
            <form key={p.email} action="/api/profile-login" method="post">
              <input type="hidden" name="email" value={p.email} />
              <button
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
            </form>
          ))}
          {profiles.length === 0 && (
            <p className="text-sm text-red-600">
              No profiles configured — set the PROFILES env var.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
