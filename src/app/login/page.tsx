import { getProfiles } from "@/lib/profiles";
import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <main className="relative flex min-h-dvh items-center justify-center bg-background px-6 text-foreground">
      <div className="absolute right-6 top-6">
        <ThemeToggle compact />
      </div>
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-semibold text-primary">
          <span aria-hidden>●</span> Valedictorian Run
        </p>

        {/* Names only — the type says {name} but RSC serializes whatever it's
            given, so map the emails off before they cross to the client. */}
        <LoginForm
          profiles={profiles.map((p) => ({ name: p.name }))}
          hadError={!!error}
        />

        {profiles.length === 0 && (
          <p className="mt-6 text-sm text-red-600">
            No profiles configured — set the PROFILES env var.
          </p>
        )}
      </div>
    </main>
  );
}
