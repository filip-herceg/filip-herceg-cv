// Minimal typed subset of Prisma client used by auth handlers to avoid `any` casts.
// This insulates the pure auth layer from full Prisma types while keeping type safety.

export interface AuthPrismaAdminUser {
  id: string
  username: string
  passwordHash: string
}

export interface AuthPrismaSession {
  id: string
  userId: string
  expiresAt: Date
  user?: AuthPrismaAdminUser
}

// Argument shapes (narrowed to what we actually use)
export interface FindUniqueAdminUserArgs { where: { username: string } }
export interface UpdateAdminUserArgs { where: { id: string }; data: { passwordHash: string } }
export interface CreateAdminUserArgs { data: { username: string; passwordHash: string } }
export interface FindFirstAdminUserArgs { where: { username: string } }

export interface CreateSessionArgs { data: { userId: string; expiresAt: Date } }
export interface DeleteSessionArgs { where: { id: string } }
export interface FindUniqueSessionArgs { where: { id: string }; include: { user: true } }
export interface UpdateSessionArgs { where: { id: string }; data: { expiresAt: Date } }
export interface CountActiveSessionsArgs { where: { expiresAt: { gt: Date } } }

export interface AuthPrisma {
  adminUser: {
    findUnique(args: FindUniqueAdminUserArgs): Promise<AuthPrismaAdminUser | null>
    findFirst(args: FindFirstAdminUserArgs): Promise<AuthPrismaAdminUser | null>
    update(args: UpdateAdminUserArgs): Promise<AuthPrismaAdminUser>
    create(args: CreateAdminUserArgs): Promise<AuthPrismaAdminUser>
  }
  session: {
    create(args: CreateSessionArgs): Promise<AuthPrismaSession>
    delete(args: DeleteSessionArgs): Promise<AuthPrismaSession>
    findUnique(args: FindUniqueSessionArgs): Promise<(AuthPrismaSession & { user: AuthPrismaAdminUser }) | null>
    update(args: UpdateSessionArgs): Promise<AuthPrismaSession>
    count(args: CountActiveSessionsArgs): Promise<number>
  }
}

// Helper to obtain subset (runtime still uses full Prisma client; types narrow usage)
export function authPrisma(p: unknown): AuthPrisma { return p as AuthPrisma }
