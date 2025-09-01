import { redirect } from 'next/navigation'
import { buildAuthContext } from '@/lib/auth/context'
import { currentUser } from '@/lib/auth/session'
import { NextCookieStore } from '@/lib/auth/cookies'
import Link from 'next/link'

async function getUser() {
  const store = await new NextCookieStore().init()
  const ctx = buildAuthContext({ store })
  const cur = await currentUser(ctx)
  return cur.user
}

export default async function AdminHome() {
  const user = await getUser()
  if (!user) redirect('/login?next=/admin')
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Authenticated as <strong>{user.username}</strong></p>
      </header>
      <section className="space-y-2">
        <h2 className="font-medium">Entities</h2>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li><Link className="text-primary hover:underline" href="/admin/skills">Skills (coming soon)</Link></li>
          <li><Link className="text-primary hover:underline" href="/admin/projects">Projects (coming soon)</Link></li>
          <li><Link className="text-primary hover:underline" href="/admin/experience">Experience (coming soon)</Link></li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">Data</h2>
        <p className="text-sm">CV data is mutated via JSON APIs. A UI editing surface will be layered here incrementally.</p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">Next Steps</h2>
        <ol className="list-decimal list-inside text-sm space-y-1">
          <li>Implement entity listing endpoints & client fetch hooks</li>
          <li>Add create / update forms with optimistic revalidation</li>
          <li>Expose mutation & cache metrics summary</li>
        </ol>
      </section>
      <section>
        <form action="/api/admin/logout" method="post">
          <button className="inline-flex items-center rounded border px-3 py-1 text-sm hover:bg-accent" type="submit">Logout</button>
        </form>
      </section>
    </main>
  )
}
