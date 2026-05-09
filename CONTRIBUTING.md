# RouteRevel — Git Contribution Guide

## Branch Structure

```
main                    ← Production only. Never commit here directly.
dev                     ← Integration branch. All features merge here first.
feature/xxx             ← Individual feature branches.
fix/xxx                 ← Bug fix branches.
hotfix/xxx              ← Critical production fixes only.
```

---

## 1. First Time Setup (New Colleague)

### Step 1 — Clone the repository

```powershell
git clone https://github.com/yashjain1974/Routerevel.git
cd Routerevel
```

### Step 2 — Install dependencies

```powershell
# Install web app dependencies
cd apps/web
npm install
cd ../..
```

### Step 3 — Set up environment file

```powershell
# Copy the example env file
copy apps\web\.env.example apps\web\.env.local
```

Then open `apps/web/.env.local` and fill in the values.
Ask the team lead (Yash) for the actual API keys — never share these in chat or email.

### Step 4 — Verify setup works

```powershell
cd apps/web
npm run dev
# Open http://localhost:3000 — you should see the RouteRevel home page
```

---

## 2. Daily Workflow — How to Contribute

### Always start from dev

Before creating any branch, make sure you have the latest `dev`:

```powershell
git checkout dev
git pull origin dev
```

### Create your feature branch

Branch names follow this pattern:
- `feature/` — new features
- `fix/` — bug fixes
- `docs/` — documentation only
- `refactor/` — code cleanup, no new features

```powershell
# Always branch off dev — never off main
git checkout dev
git checkout -b feature/your-feature-name

# Examples:
git checkout -b feature/stop-card-photos
git checkout -b feature/google-maps-integration
git checkout -b fix/input-icon-overlap
git checkout -b docs/api-documentation
```

### Do your work

Make changes, test locally:

```powershell
cd apps/web
npm run dev
```

### Stage and commit

```powershell
# Stage all changes
git add .

# OR stage specific files only
git add components/stops/StopCard.tsx
git add components/stops/StopCard.module.css
```

Commit messages follow this format:

```
type(scope): short description

Types: feat | fix | docs | refactor | style | test | chore
Scope: web | server | mobile | stops | map | auth | ui
```

Examples:

```powershell
git commit -m "feat(stops): add photo carousel to stop detail sheet"
git commit -m "fix(ui): correct icon overlap on route input fields"
git commit -m "refactor(store): split route store into smaller slices"
git commit -m "docs(readme): add API setup instructions"
git commit -m "style(stops): apply CSS module to StopsList sort bar"
```

### Push your branch

```powershell
git push -u origin feature/your-feature-name
```

---

## 3. Opening a Pull Request (PR)

1. Go to `https://github.com/yashjain1974/Routerevel`
2. You will see a banner: **"Compare & pull request"** — click it
3. Set the PR target like this:

```
base: dev  ←  compare: feature/your-feature-name
```

**Never open a PR directly to `main`.**

4. Fill in the PR description:

```
## What this PR does
Brief description of what you built or fixed.

## Screenshots (if UI changes)
Paste before/after screenshots here.

## How to test
1. Go to localhost:3000
2. Type Hyderabad → Bangalore
3. Click Discover stops
4. Verify stop cards load correctly

## Checklist
- [ ] Tested locally with npm run dev
- [ ] No console errors
- [ ] .env.local not committed
- [ ] CSS module used (no inline styles for new components)
```

5. Request a review from **yashjain1974** (Yash)
6. Wait for approval before merging

---

## 4. Reviewing and Merging a PR (Team Lead — Yash)

### Review a colleague's PR

```powershell
# Fetch their branch locally to test it
git fetch origin
git checkout feature/their-feature-name
cd apps/web
npm run dev
# Test it manually
```

### Merge approved PR to dev

On GitHub:
1. Open the PR
2. Click **"Merge pull request"**
3. Choose **"Squash and merge"** — keeps `dev` history clean
4. Delete the branch after merge

### Merge dev to main (release)

Only when `dev` is stable and tested:

```powershell
git checkout main
git pull origin main
git merge dev --no-ff -m "release: merge dev into main — v0.1.0"
git push origin main
```

The `--no-ff` flag creates a merge commit so the release is visible in history.

---

## 5. Keeping Your Branch Up to Date

If `dev` gets new commits while you're working on your feature:

```powershell
# Update dev
git checkout dev
git pull origin dev

# Go back to your feature branch
git checkout feature/your-feature-name

# Rebase onto latest dev (cleaner than merge)
git rebase dev

# If there are conflicts, resolve them then:
git rebase --continue

# Push (force needed after rebase)
git push origin feature/your-feature-name --force-with-lease
```

---

## 6. Hotfix — Urgent Production Bug

If something is broken on `main` and needs immediate fix:

```powershell
# Branch off main directly
git checkout main
git pull origin main
git checkout -b hotfix/fix-description

# Fix the bug, commit
git add .
git commit -m "fix: critical description of what was broken"

# Push and open PR → main
git push -u origin hotfix/fix-description

# After merging to main, also merge back to dev
git checkout dev
git merge main
git push origin dev
```

---

## 7. Common Commands Quick Reference

```powershell
# See all branches (local + remote)
git branch -a

# Switch to an existing branch
git checkout branch-name

# See what changed
git status
git diff

# See commit history
git log --oneline --graph --all

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all local changes (dangerous)
git checkout .

# Pull latest from remote
git pull origin dev

# Delete local branch after PR merged
git branch -d feature/your-feature-name

# Delete remote branch
git push origin --delete feature/your-feature-name
```

---

## 8. Rules — Must Follow

```
✅ Always branch off dev — never off main
✅ One feature per branch — keep PRs small and focused
✅ Test locally before pushing
✅ Never commit .env.local or any file with API keys
✅ Write meaningful commit messages (see format above)
✅ Always open PR to dev — never directly to main
✅ Get at least 1 approval before merging
✅ Delete branch after PR is merged
✅ Pull latest dev before starting new work

❌ Never force push to main or dev
❌ Never commit node_modules/
❌ Never commit .next/ build folder
❌ Never skip the PR review process
❌ Never work directly on main or dev
```

---

## 9. Project Structure Quick Reference

```
Routerevel/
├── apps/
│   ├── web/                  ← Next.js 16 web app (start here)
│   │   ├── app/              ← Pages (App Router)
│   │   ├── components/       ← React components
│   │   │   ├── home/         ← Hero, RouteInput
│   │   │   ├── stops/        ← StopCard, StopsList, StopDetail
│   │   │   ├── map/          ← RouteMap, StopMarker (coming soon)
│   │   │   ├── shared/       ← LoadingSpinner, ErrorBoundary
│   │   │   └── ui/           ← shadcn components (auto-generated)
│   │   ├── hooks/            ← Custom React hooks
│   │   ├── lib/              ← Utilities (utils.ts, api.ts)
│   │   ├── stores/           ← Zustand state stores
│   │   ├── types/            ← TypeScript interfaces
│   │   └── .env.local        ← Local secrets (never commit)
│   └── mobile/               ← React Native Expo (Phase 2)
└── server/                   ← Node.js backend (coming soon)
```

---

## 10. Tech Stack Reference

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | 16.2.6 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.3.0 |
| Components | shadcn/ui (Radix) | latest |
| Animations | Framer Motion | 12.x |
| State | Zustand | latest |
| Icons | Lucide React | latest |
| Font | Geist (Vercel) | latest |
| Node.js | v22 LTS | 22.x |

---

## 11. Getting Help

- **Slack / WhatsApp** the team before opening an issue
- **GitHub Issues** for bugs that need tracking
- **PR comments** for code review feedback
- Ask Yash for API keys, deployment access, or architecture questions

---

*RouteRevel · Internal Documentation · Confidential*