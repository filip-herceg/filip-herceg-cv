# Development Workflow

## Prerequisites

- Node.js 20+
- npm (using npm consistently for lock determinism)
- Docker (optional for container build)

## Setup

```bash
npm ci
npm run dev
```

Visit http://localhost:3000

## Scripts

| Script    | Purpose                           |
| --------- | --------------------------------- |
| dev       | Start dev server                  |
| build     | Production build                  |
| start     | Run built app                     |
| lint      | ESLint (flat config)              |
| typecheck | TypeScript check                  |
| lhci      | Lighthouse CI autorun (warn only) |

## Adding UI Components (shadcn/ui)

```bash
npx shadcn add <component>
```

## Code Style

- Prettier (.prettierrc)
- EditorConfig enforced
- ESLint extends next/core-web-vitals + custom rules

## Import Paths

Use `@/` alias mapping to `src/*`.

## Testing (Future)

Add playwright / vitest as needed (not included yet).
