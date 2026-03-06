import Link from 'next/link'
import { Heading } from '@/components/heading'
import { Text } from '@/components/text'
import { Button } from '@/components/button'
import { getCurrentUser } from '@/lib/utils/currentUser'

/**
 * Public landing page — Server Component.
 *
 * Renders a hero section for The Codex bookstore. If the user is already
 * authenticated, the CTA says "Enter The Library" and links to /catalog.
 * Otherwise it says "Get Started" and links to /login.
 */
export default async function HomePage() {
  const userId = await getCurrentUser()
  const isAuthenticated = !!userId

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-8 px-6 py-32 text-center">
        <Heading level={1}>The Codex</Heading>
        <Text className="max-w-md text-lg">
          Your personal bookstore. Browse the catalog, leave reviews, and build
          your library.
        </Text>
        <Link href={isAuthenticated ? '/catalog' : '/login'}>
          <Button>
            {isAuthenticated ? 'Enter The Library' : 'Get Started'}
          </Button>
        </Link>
      </main>
    </div>
  )
}
