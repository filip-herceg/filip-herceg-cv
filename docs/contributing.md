# Contributing Guidelines

## Branching

- `main`: deployable
- feature branches: `feat/<short-name>`
- fixes: `fix/<issue>`

## Commit Style

Conventional Commits recommended:

- feat: new feature
- fix: bug fix
- docs: documentation
- chore: tooling/maintenance
- refactor: code restructuring

## Pull Requests

1. Ensure lint & typecheck pass
2. Build locally (`npm run build`)
3. Describe change & rationale
4. Update docs if behavior changes

## UI Components

- Prefer shadcn primitives
- Keep styling in Tailwind utility classes

## Accessibility

- Provide alt text
- Use semantic headings

## Performance

- Avoid large client bundles
- Lazy load non-critical components

## Adding Dependencies

- Justify in PR description
- Prefer lightweight libs

## Review Checklist

- Code clarity
- Tests (when added)
- Security considerations
- Docs updated
