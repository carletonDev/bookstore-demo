import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Button } from "@/components/button";
import { Alert } from "@/components/alert";
import { signInWithGoogle } from "@/lib/actions/auth";

interface LoginPageProps {
  // searchParams is a Promise in Next.js 16 (async request APIs)
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed: "Authentication failed. Please try again.",
  oauth_init_failed: "Could not connect to Google. Please try again.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "An unexpected error occurred.")
    : null;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Wordmark — Catalyst Heading + Text */}
        <div className="text-center space-y-1">
          <Heading level={1}>Bookstore</Heading>
          <Text>Sign in to browse and purchase books</Text>
        </div>

        {/* Card */}
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-800 dark:ring-white/10 p-8 space-y-6">
          {/* Error banner — Catalyst Alert, destructive variant */}
          {errorMessage && <Alert variant="destructive">{errorMessage}</Alert>}

          {/* Google sign-in — Catalyst Button (outline), form action triggers Server Action */}
          <form action={signInWithGoogle}>
            <Button type="submit" outline className="w-full">
              <GoogleIcon />
              Sign in with Google
            </Button>
          </form>

          {/* Footer — Catalyst Text, xs override */}
          <Text className="text-center text-xs">
            By signing in you agree to our terms of service.
          </Text>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
