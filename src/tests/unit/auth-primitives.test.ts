import { describe, it, expect, vi, beforeEach } from 'vitest'

// We'll mock prisma-subset to pass through a mocked prisma we control
vi.mock('@/lib/auth/prisma-subset', () => ({ authPrisma: (p: any) => p })) // eslint-disable-line @typescript-eslint/no-explicit-any

// Simple in-memory store for admin users
function makePrisma() {
  const users: any[] = [] // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    adminUser: {
      findFirst: vi.fn(async ({ where: { username } }: any) => users.find(u => u.username === username) || null), // eslint-disable-line @typescript-eslint/no-explicit-any
      findUnique: vi.fn(async ({ where: { username } }: any) => users.find(u => u.username === username) || null), // eslint-disable-line @typescript-eslint/no-explicit-any
      findMany: vi.fn(async ({ select }: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (select) {
          return users.map(u => ({ id: u.id, username: u.username, createdAt: u.createdAt }))
        }
        return users
      }),
      create: vi.fn(async ({ data }: any) => { const u = { id: `u${users.length+1}` , createdAt: new Date(), ...data }; users.push(u); return u }), // eslint-disable-line @typescript-eslint/no-explicit-any
      update: vi.fn(async ({ where: { id }, data: { passwordHash } }: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const u = users.find(x => x.id === id)
        if (u) {
          u.passwordHash = passwordHash
        }
        return u
      })
    }
  }
}

describe('auth cryptographic primitives & bootstrap', () => {
  let prisma: any // eslint-disable-line @typescript-eslint/no-explicit-any
  beforeEach(() => { prisma = makePrisma(); vi.resetModules() })

  it('hashPassword + verifyPassword roundtrip and mismatch', async () => {
    const { hashPassword, verifyPassword } = await import('@/lib/auth')
    const hash = hashPassword('secret123')
    expect(hash.startsWith('scrypt$')).toBe(true)
    expect(verifyPassword('secret123', hash)).toBe(true)
    expect(verifyPassword('wrong', hash)).toBe(false)
  })

  it('ensureAdminBootstrap creates admin only once', async () => {
    process.env.ADMIN_BOOTSTRAP_USERNAME = 'root'
    process.env.ADMIN_BOOTSTRAP_PASSWORD = 'initpw'
    // Inject our prisma by monkey patching the module internal singleton via first call
  const mod: any = await import('@/lib/auth') // eslint-disable-line @typescript-eslint/no-explicit-any
  mod.__setPrismaForTests(prisma)
    await mod.ensureAdminBootstrap()
    await mod.ensureAdminBootstrap() // second call is no-op
    expect(prisma.adminUser.create).toHaveBeenCalledTimes(1)
  })

  it('changePassword updates password hash', async () => {
  const mod: any = await import('@/lib/auth') // eslint-disable-line @typescript-eslint/no-explicit-any
  mod.__setPrismaForTests(prisma)
    // seed a user
    await prisma.adminUser.create({ data: { username: 'alice', passwordHash: 'old' } })
  // initial creation done above; mutate after changePassword
    const u = await prisma.adminUser.findFirst({ where: { username: 'alice' } })
    await mod.changePassword(u.id, 'newpw')
    const updated = await prisma.adminUser.findFirst({ where: { username: 'alice' } })
    expect(updated.passwordHash).not.toBe('old')
  })

  it('listUsers returns minimal fields', async () => {
  const mod: any = await import('@/lib/auth') // eslint-disable-line @typescript-eslint/no-explicit-any
  mod.__setPrismaForTests(prisma)
    await prisma.adminUser.create({ data: { username: 'bob', passwordHash: 'x' } })
    const users = await mod.listUsers()
    expect(users[0].username).toBe('bob')
    expect(users[0].createdAt).toBeDefined()
  })
})
