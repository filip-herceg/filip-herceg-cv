-- Initial Prisma migration (manually authored)
-- Generated to align with schema.prisma at PostgreSQL provider switch.

CREATE TABLE "Person" (
  "id" TEXT PRIMARY KEY,
  "locale" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "profile" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "location" TEXT,
  "phone" TEXT,
  "website" TEXT,
  "github" TEXT,
  "linkedin" TEXT,
  "twitter" TEXT,
  "linksJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Skill" (
  "id" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "level" TEXT,
  "years" INTEGER,
  "tagsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id", "locale")
);

CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "company" TEXT,
  "summary" TEXT NOT NULL,
  "highlightsJson" JSONB,
  "stackJson" JSONB,
  "impact" TEXT,
  "linksJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id", "locale")
);

CREATE TABLE "Experience" (
  "id" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "location" TEXT,
  "employmentType" TEXT,
  "summary" TEXT,
  "achievementsJson" JSONB,
  "stackJson" JSONB,
  "tagsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id", "locale")
);

CREATE TABLE "Education" (
  "id" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "institution" TEXT NOT NULL,
  "degree" TEXT NOT NULL,
  "field" TEXT,
  "period" TEXT NOT NULL,
  "location" TEXT,
  "grade" TEXT,
  "summary" TEXT,
  "highlightsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id", "locale")
);

CREATE TABLE "Certification" (
  "id" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "issuer" TEXT NOT NULL,
  "year" INTEGER,
  "url" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id", "locale")
);

CREATE TABLE "Trait" (
  "id" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id", "locale")
);

CREATE TABLE "Hobby" (
  "id" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id", "locale")
);

CREATE TABLE "Design" (
  "id" TEXT PRIMARY KEY,
  "locale" TEXT NOT NULL UNIQUE,
  "pageJson" JSONB NOT NULL,
  "paletteJson" JSONB NOT NULL,
  "typographyJson" JSONB NOT NULL,
  "shapesJson" JSONB NOT NULL,
  "sectionsJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Meta" (
  "key" TEXT PRIMARY KEY,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AdminUser" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Session" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_session_user FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE
);

CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- Prisma normally manages updatedAt via application updates; DB trigger optional (omitted for simplicity).
