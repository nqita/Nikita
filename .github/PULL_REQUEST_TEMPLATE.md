## Pull Request

### Description
<!-- What does this PR do? Why is it needed? -->

### Type of Change
- [ ] `feat` — New feature
- [ ] `fix` — Bug fix
- [ ] `chore` — Maintenance / dependency update
- [ ] `refactor` — Refactoring (no behavior change)
- [ ] `docs` — Documentation only
- [ ] `perf` — Performance improvement
- [ ] `style` — Formatting only
- [ ] `test` — Tests only

### Checklist

#### API Changes (`src/`)
- [ ] New routes use `requireAuth()` middleware
- [ ] New routes use `rateLimit()` middleware
- [ ] New routes use `zValidator` for body validation
- [ ] Responses follow `{ data, error }` envelope
- [ ] Route mounted at both `/v1/...` and `/api/v1/...` in `src/index.ts`
- [ ] User message content is **not** logged anywhere

#### Extension Changes (`apps/extension/`)
- [ ] Content scripts use Shadow DOM for UI injection
- [ ] No global CSS added to host page
- [ ] Auth tokens not placed in `PLASMO_PUBLIC_*` variables
- [ ] Builds successfully for Chrome MV3: `npm run build`

#### Environment / Config
- [ ] New env variables added to `.env.example` with placeholder
- [ ] New KV bindings added to `src/types.ts` Env interface and `wrangler.toml`
- [ ] No real secrets committed

#### General
- [ ] TypeScript type errors resolved (`npm run type-check`)
- [ ] Conventional commit format used (`feat/fix/chore/...`)

### Related Issues
<!-- Closes #... -->
