#!/usr/bin/env node
/**
 * lib/db/seed.ts
 *
 * High-scale database seed for the Bookstore Demo.
 *
 * Run:  npm run seed
 *
 * Uses the Supabase admin (service role) client — SUPABASE_SECRET_KEY — to
 * bypass RLS. Loads credentials from .env.local via dotenv.
 *
 * Volume:
 *   publishers   10
 *   authors      50
 *   genres       12
 *   books        210
 *   book_authors ~260  (30% co-authored)
 *   book_genres  ~420  (1–3 genres per book)
 *   seed users   20    (auth.users, for reviews only)
 *   reviews      ~600  (3–10 per ~55% of books)
 */

import { createClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
)

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function insertBatched<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  batchSize = 50,
): Promise<void> {
  for (const batch of chunk(rows, batchSize)) {
    const { error } = await supabase.from(table).insert(batch)
    if (error) throw new Error(`Insert into ${table} failed: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// Static seed data
// ---------------------------------------------------------------------------

const PUBLISHERS = [
  { name: "O'Reilly Media",       website: 'https://oreilly.com' },
  { name: 'Pragmatic Bookshelf',  website: 'https://pragprog.com' },
  { name: 'Manning Publications', website: 'https://manning.com' },
  { name: 'No Starch Press',      website: 'https://nostarch.com' },
  { name: 'Apress',               website: 'https://apress.com' },
  { name: 'Packt Publishing',     website: 'https://packtpub.com' },
  { name: 'Addison-Wesley',       website: 'https://pearson.com' },
  { name: 'Wiley',                website: 'https://wiley.com' },
  { name: 'Springer',             website: 'https://springer.com' },
  { name: 'MIT Press',            website: 'https://mitpress.mit.edu' },
]

const GENRES = [
  { name: 'Distributed Systems',   slug: 'distributed-systems' },
  { name: 'Frontend Architecture', slug: 'frontend-architecture' },
  { name: 'Machine Learning',      slug: 'machine-learning' },
  { name: 'Rust',                  slug: 'rust' },
  { name: 'DevOps',                slug: 'devops' },
  { name: 'Security',              slug: 'security' },
  { name: 'Databases',             slug: 'databases' },
  { name: 'Cloud Native',          slug: 'cloud-native' },
  { name: 'TypeScript',            slug: 'typescript' },
  { name: 'Go',                    slug: 'go' },
  { name: 'Python',                slug: 'python' },
  { name: 'System Design',         slug: 'system-design' },
]

const FORMATS = ['hardcover', 'softcover', 'audiobook', 'ereader'] as const

const TECH_TOPICS = [
  'Kubernetes', 'Docker', 'React', 'TypeScript', 'Rust', 'Go', 'Python',
  'PostgreSQL', 'Redis', 'Kafka', 'gRPC', 'GraphQL', 'WebAssembly',
  'Terraform', 'AWS Lambda', 'Microservices', 'Event Sourcing', 'CQRS',
  'Distributed Tracing', 'Service Meshes', 'Istio', 'Envoy', 'Prometheus',
  'OpenTelemetry', 'CI/CD Pipelines', 'Infrastructure as Code', 'Helm',
  'Concurrency in Go', 'Zero-Cost Abstractions', 'Domain-Driven Design',
  'Hexagonal Architecture', 'Clean Architecture', 'API Design',
  'WebSockets', 'HTTP/3', 'Cryptography', 'OAuth 2.0',
  'Zero Trust Networking', 'Supply Chain Security', 'Observability',
  'Site Reliability Engineering', 'Chaos Engineering', 'Feature Flags',
  'eBPF', 'Nix', 'Bazel', 'Protocol Buffers', 'Apache Arrow',
]

const TITLE_TEMPLATES = [
  (t: string) => `${t}: The Definitive Guide`,
  (t: string) => `${t} in Practice`,
  (t: string) => `Mastering ${t}`,
  (t: string) => `${t} Design Patterns`,
  (t: string) => `${t} at Scale`,
  (t: string) => `Professional ${t}`,
  (t: string) => `Learning ${t}`,
  (t: string) => `${t} Cookbook`,
  (t: string) => `${t} in Action`,
  (t: string) => `High-Performance ${t}`,
  (t: string) => `${t} Architecture`,
  (t: string) => `${t}: A Practical Approach`,
  (t: string) => `The ${t} Handbook`,
  (t: string) => `${t} from Scratch`,
  (t: string) => `Real-World ${t}`,
  (t: string) => `${t} Best Practices`,
  (t: string) => `${t} Under the Hood`,
  (t: string) => `Building with ${t}`,
  (t: string) => `${t}: Deep Dive`,
  (t: string) => `Production-Ready ${t}`,
  (t: string) => `${t} for Platform Engineers`,
  (t: string) => `Scaling ${t}`,
  (t: string) => `${t} Internals`,
  (t: string) => `Effective ${t}`,
  (t: string) => `${t}: Beyond the Basics`,
]

const REVIEW_TITLES = [
  'A must-read for any serious developer',
  'Exceptional depth and clarity',
  'Changed how I approach this problem',
  'Dense but worth every page',
  'Best reference on this topic',
  'Could use more production examples',
  'Solid foundation, great exercises',
  'Surprisingly accessible for the subject',
  'Great for staff+ engineers',
  'Required reading for my whole team',
  'Well-structured and comprehensive',
  'Slightly outdated in places, but core concepts hold',
  'Essential for anyone building at scale',
  'The examples are exactly what I needed',
]

const DEV_SPECIALIZATIONS = [
  'distributed systems', 'compiler design', 'cloud-native architecture',
  'systems programming', 'frontend performance', 'database internals',
  'platform engineering', 'machine learning infrastructure', 'cryptography',
  'Rust programming', 'Go concurrency patterns', 'observability',
  'API design', 'developer tooling', 'DevOps and SRE practices',
  'WebAssembly runtimes', 'storage engine design', 'network protocols',
]

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

async function seedPublishers(): Promise<string[]> {
  const { data, error } = await supabase
    .from('publishers')
    .insert(PUBLISHERS)
    .select('id')
  if (error) throw new Error(`Publishers: ${error.message}`)
  console.log(`  publishers     ${data.length}`)
  return data.map((r: { id: string }) => r.id)
}

async function seedAuthors(): Promise<string[]> {
  const rows = Array.from({ length: 50 }, () => {
    const firstName = faker.person.firstName()
    const lastName  = faker.person.lastName()
    const spec      = pick(DEV_SPECIALIZATIONS)
    const years     = randInt(8, 25)
    return {
      first_name: firstName,
      last_name:  lastName,
      bio: `${firstName} ${lastName} is a software engineer specializing in ${spec} ` +
           `with over ${years} years of industry experience. They have contributed to ` +
           `open-source projects and previously held senior roles at ` +
           `${faker.company.name()} and ${faker.company.name()}.`,
    }
  })

  const { data, error } = await supabase.from('authors').insert(rows).select('id')
  if (error) throw new Error(`Authors: ${error.message}`)
  console.log(`  authors        ${data.length}`)
  return data.map((r: { id: string }) => r.id)
}

async function seedGenres(): Promise<string[]> {
  const { data, error } = await supabase.from('genres').insert(GENRES).select('id')
  if (error) throw new Error(`Genres: ${error.message}`)
  console.log(`  genres         ${data.length}`)
  return data.map((r: { id: string }) => r.id)
}

/**
 * Creates real auth.users rows using the admin API so reviews can satisfy
 * the `user_id REFERENCES auth.users(id)` foreign key constraint.
 * These are seed-only accounts; email_confirm is forced true.
 */
async function seedAuthUsers(count = 20): Promise<string[]> {
  const ids: string[] = []
  for (let i = 0; i < count; i++) {
    const { data, error } = await supabase.auth.admin.createUser({
      email:         faker.internet.email({ provider: 'seed.bookstore.dev' }),
      password:      faker.internet.password({ length: 24 }),
      email_confirm: true,
    })
    if (error) throw new Error(`Seed user ${i + 1}: ${error.message}`)
    ids.push(data.user.id)
  }
  console.log(`  seed users     ${ids.length}`)
  return ids
}

async function seedBooks(publisherIds: string[]): Promise<string[]> {
  // Build the title space: all template × topic combinations
  const titleSet = new Set<string>()
  for (const template of TITLE_TEMPLATES) {
    for (const topic of TECH_TOPICS) {
      const title = template(topic)
      titleSet.add(title)
    }
  }

  // Shuffle and cap at 210 — well above the 200-row requirement
  const titles = [...titleSet].sort(() => Math.random() - 0.5).slice(0, 210)

  const rows = titles.map(title => ({
    title,
    isbn:         faker.commerce.isbn(13),
    publisher_id: pick(publisherIds),
    price:        parseFloat((Math.random() * (149.99 - 19.99) + 19.99).toFixed(2)),
    formats:      pickN([...FORMATS], randInt(1, 3)),
    description:  `A comprehensive guide to ${title.replace(/:.+/, '').toLowerCase()}. ` +
                  faker.lorem.sentences(3),
    published_at: faker.date
      .between({ from: '2015-01-01', to: '2025-12-31' })
      .toISOString()
      .split('T')[0],
  }))

  let allIds: string[] = []
  for (const batch of chunk(rows, 50)) {
    const { data, error } = await supabase.from('books').insert(batch).select('id')
    if (error) throw new Error(`Books: ${error.message}`)
    allIds = allIds.concat(data.map((r: { id: string }) => r.id))
  }
  console.log(`  books          ${allIds.length}`)
  return allIds
}

async function seedBookAuthors(bookIds: string[], authorIds: string[]): Promise<void> {
  const rows: Array<{ book_id: string; author_id: string }> = []
  for (const bookId of bookIds) {
    // 30% chance of a second author (co-authorship)
    const count    = Math.random() < 0.3 ? 2 : 1
    const selected = pickN(authorIds, count)
    for (const authorId of selected) rows.push({ book_id: bookId, author_id: authorId })
  }
  await insertBatched('book_authors', rows, 100)
  console.log(`  book_authors   ${rows.length}`)
}

async function seedBookGenres(bookIds: string[], genreIds: string[]): Promise<void> {
  const rows: Array<{ book_id: string; genre_id: string }> = []
  for (const bookId of bookIds) {
    const selected = pickN(genreIds, randInt(1, 3))
    for (const genreId of selected) rows.push({ book_id: bookId, genre_id: genreId })
  }
  await insertBatched('book_genres', rows, 100)
  console.log(`  book_genres    ${rows.length}`)
}

async function seedReviews(bookIds: string[], userIds: string[]): Promise<void> {
  // Target ~55% of books to receive reviews
  const booksToReview = [...bookIds]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(bookIds.length * 0.55))

  const rows: Array<{
    book_id: string
    user_id: string
    rating:  number
    title:   string
    body:    string
  }> = []

  for (const bookId of booksToReview) {
    // Clamp to userIds.length to respect UNIQUE (book_id, user_id)
    const reviewerCount = Math.min(randInt(3, 10), userIds.length)
    const reviewers     = pickN(userIds, reviewerCount)
    for (const userId of reviewers) {
      rows.push({
        book_id: bookId,
        user_id: userId,
        rating:  randInt(1, 5),
        title:   pick(REVIEW_TITLES),
        body:    faker.lorem.sentences(randInt(2, 5)),
      })
    }
  }

  await insertBatched('reviews', rows, 100)
  console.log(`  reviews        ${rows.length}`)
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error(
      'Missing environment variables. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local',
    )
  }

  console.log('Seeding bookstore database...\n')
  console.log('Table               Rows')
  console.log('──────────────────  ────')

  const publisherIds = await seedPublishers()
  const authorIds    = await seedAuthors()
  const genreIds     = await seedGenres()
  const userIds      = await seedAuthUsers(20)
  const bookIds      = await seedBooks(publisherIds)
  await seedBookAuthors(bookIds, authorIds)
  await seedBookGenres(bookIds, genreIds)
  await seedReviews(bookIds, userIds)

  console.log('\nSeed complete.')
}

main().catch(err => {
  console.error('\nSeed failed:', err.message)
  process.exit(1)
})
