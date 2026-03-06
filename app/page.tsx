import Link from 'next/link'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { Terminal } from '@/components/Terminal'
import { getCurrentUser } from '@/lib/utils/currentUser'
import { signInWithGoogle } from '@/lib/actions/auth'

function GitHubIcon(): React.ReactElement {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-5 w-5 shrink-0"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

export default async function Home(): Promise<React.ReactElement> {
  const userId = await getCurrentUser()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-16 font-mono">
      <main className="flex w-full max-w-2xl flex-col items-center gap-12">
        {/* Brand */}
        <div className="space-y-3 text-center">
          <Heading level={1} className="text-5xl tracking-tight text-white sm:text-6xl">
            The Codex
          </Heading>
          <Text className="text-lg text-zinc-400">
            The Online Bookstore Demo
          </Text>
        </div>

        {/* Terminal animation */}
        <Terminal />

        {/* CTAs */}
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          {userId ? (
            <Link href="/catalog">
              <Button className="px-6 py-3">
                Enter The Library
              </Button>
            </Link>
          ) : (
            <form action={signInWithGoogle}>
              <Button type="submit" className="px-6 py-3">
                Sign in with Google
              </Button>
            </form>
          )}

          <a
            href="https://github.com/carletonDev/bookstore-demo"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button outline className="px-6 py-3">
              <GitHubIcon />
              View on GitHub
            </Button>
          </a>
        </div>
      </main>
    </div>
  )
}
