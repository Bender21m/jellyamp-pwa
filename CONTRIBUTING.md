# JellyAmp Development Workflow

## Branches

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Production — stable, tested code only | app.jellyamp.com |
| `develop` | Staging — active development, testing | Vercel preview URL |
| `feat/*` | Feature branches off develop | Vercel preview URL |

## Rules

### main (production)
- **Never push directly to main**
- Only merge from `develop` after testing on staging
- Every merge = a new production deployment

### develop (staging)
- All new work happens here or in feature branches off develop
- Push freely — Vercel builds a preview for every push
- Test on the preview URL before merging to main

### Feature branches
- For bigger features: branch off `develop` as `feat/feature-name`
- Merge back to `develop` when ready
- Delete after merge

## Workflow

```
1. git checkout develop
2. git pull origin develop
3. [make changes]
4. npm run build              ← MUST pass before pushing
5. git push origin develop
6. Test on Vercel preview URL
7. When ready for production:
   git checkout main
   git merge develop
   git push origin main
```

## Pre-Push Checklist
- [ ] `npm run build` passes (0 errors)
- [ ] Tested in browser
- [ ] No console.log/debug left in code
- [ ] Commit message is descriptive
