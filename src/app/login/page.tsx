import { getProfiles } from "@/lib/profiles";
import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/theme-toggle";

// Magic-link sign-in: pick a profile, receive a link in your email.
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

        {/* Names only. Anything handed to a client component lands in the RSC
            payload of this PUBLIC page — emails included, which is how they
            leaked before. The form posts an index to /api/send-link instead. */}
        <LoginForm
          profiles={profiles.map((p) => p.name)}
          hadError={!!error}
        />

        {profiles.length === 0 && (
          <p className="mt-6 text-sm text-red-600 dark:text-red-400">
            No profiles configured. Set the PROFILES env var.
          </p>
        )}
      </div>
    </main>
  );
}
