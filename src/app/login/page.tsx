import { getProfiles } from "@/lib/profiles";
import { LoginForm } from "./login-form";

// Sign-in gate: one shared password (real Supabase auth), then pick a profile.
// Two steps — password first, profile second — handled in LoginForm.
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

        <LoginForm profiles={profiles} hadError={!!error} />

        {profiles.length === 0 && (
          <p className="mt-6 text-sm text-red-600">
            No profiles configured — set the PROFILES env var.
          </p>
        )}
      </div>
    </main>
  );
}
