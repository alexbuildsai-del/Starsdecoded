# Staging runbook (Owner, one-time)

Body of the runbook for `docs/specs/draft/staging-environment.md`. The same
checklist is published as a tickable page:
https://claude.ai/code/artifact/d1091f1b-3923-488c-9596-93c92df325e7.
About two hours in total, in one sitting or several. Each part ends with a
check. Menu names are as of September 2026 and may differ slightly.

Three rules throughout: keys go only into the dashboard field named in the
step, never into chat, GitHub or a document. The only things handed back to
Claude are the staging Railway domain (E7) and "done" per part. Copy values
from the password manager, never retype them.

| | Staging | Production |
|---|---|---|
| Address | `starsdecoded-staging.vercel.app` | `starsdecoded.vercel.app` |
| Gets new code | every merged change | only when Claude runs Promote |
| Database | new Supabase project | the existing one |
| Sign-in | same Clerk Development instance for both, until a custom domain exists | |
| Prompt editing | allowed at `/admin/prompts` | read-only, copied from staging on promote |
| Stripe, later | test mode | live mode |

## A. Supabase, a separate staging database (10 min)

- [ ] supabase.com/dashboard → organisation → **New project**.
- [ ] Name `starsdecoded-staging`; region the same as production (production
      project → Settings → General).
- [ ] Leave **GitHub** unconnected; untick **Enable Data API**. The engine
      talks to Postgres directly and never uses the REST API. Never connect
      either Supabase project to GitHub or enable branching: the production
      schema was wiped on 2026-09-10 right after that integration was added.
- [ ] Generate the password, save it as "Supabase staging DB password", then
      **Create new project** and wait for "Project is ready".
- [ ] **Connect** (top bar) → **Session pooler** → copy the URI (contains
      `pooler.supabase.com:5432`). Not Transaction pooler, not Direct.
- [ ] Replace `[YOUR-PASSWORD]`, brackets included. Save as "Supabase staging
      DATABASE_URL". Pasted into Railway in E and F.
- [ ] Create no tables; the first deploy builds them.
- Check: dashboard "Healthy", Table Editor empty.

## B. Clerk, nothing to create (3 min)

The live site runs on the Clerk **Development** instance, which works on any
address, so staging uses it too. A Production instance needs a custom domain.

- [ ] Do not click "Create production instance".
- [ ] Note that `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` and
      `ADMIN_USER_ID` live in Railway → production → Variables; E copies all
      three unchanged.
- Check: the Clerk switcher still says Development.

## C. OpenAI, a key only staging uses (5 min)

- [ ] platform.openai.com → Settings → Organization → Projects → **Create
      project** `starsdecoded-staging`.
- [ ] Optional: Limits → a small monthly budget.
- [ ] API keys → **Create new secret key**, project `starsdecoded-staging`,
      name `railway-staging`. Save as "OpenAI staging key" (shown once).
- Check: the key is listed under the staging project.

## D. Two random secrets (2 min)

- [ ] Password manager: generate 32+ characters, letters and digits, save as
      "SESSION_SECRET staging".
- [ ] Again, as "INVITE_TOKEN_SECRET staging". Both differ from production.

## E. Railway, the staging environment (20 min)

Create it **empty, not duplicated**: a copy carries production's database
address and keys into staging. If only duplicate is offered, replace every
variable below before deploying.

- [ ] railway.app → Stars Decoded project. Top left shows `production`.
- [ ] Click it → **New environment** → name `staging` (lowercase) → empty.
- [ ] Top left now says `staging`. Click the engine service → **Settings**.
- [ ] Add a service from the GitHub repo `alexbuildsai-del/Starsdecoded`,
      branch `main`. No Root Directory. **Wait for CI** stays off: the GitHub
      smoke check waits for Railway, so both waiting would deadlock. Build,
      start command (which runs the database bootstrap first) and health
      check `/api/healthz` come from `railway.json`.
- [ ] **Variables** → **RAW Editor** → paste and fill:

```
DATABASE_URL=<Supabase staging DATABASE_URL>
DATABASE_SSL=require
NODE_ENV=production
APP_ENV=staging
CLERK_PUBLISHABLE_KEY=<same as production>
CLERK_SECRET_KEY=<same as production>
ADMIN_USER_ID=<same as production>
OPENAI_API_KEY=<OpenAI staging key>
SESSION_SECRET=<SESSION_SECRET staging>
INVITE_TOKEN_SECRET=<INVITE_TOKEN_SECRET staging>
PUBLIC_APP_URL=https://starsdecoded-staging.vercel.app
RESEND_API_KEY=<same as production>
RESEND_FROM_EMAIL=<same as production>
```

  `NODE_ENV=production` also on staging: it controls cookie security, not
  which copy this is. Never add `PROMPT_SOURCE_DATABASE_URL`,
  `PROMPTS_READ_ONLY` or `PORT` here.
- [ ] **Deploy**. Fails until Claude's pull request is merged; expected.
- [ ] **Settings → Networking → Public Networking → Generate Domain**. Accept
      the proposed port.
- [ ] Send that domain to Claude in chat. It is public. Claude puts it in
      `vercel.json`.
- Check: top left `staging`, 14 variables, a domain under Networking.

## F. Railway, production (5 min)

- [ ] Switch to `production` → engine service → **Variables** → add:

```
APP_ENV=production
PROMPTS_READ_ONLY=true
PROMPT_SOURCE_DATABASE_URL=<Supabase staging DATABASE_URL>
```

  The last one is the **staging** line. If it were production's, the deploy
  stops itself with an error rather than sync a database onto itself.
- [ ] **Settings → Source** → branch `production`, then Deploy. The branch
      already exists with the live code, so customers see no change.
- [ ] **Settings → Deploy → Custom Start Command** must be empty, so the
      command in `railway.json` (bootstrap, then start) applies. A value
      typed here in the past overrides the file: the API starts, but the
      schema is never created and `/api/healthz/db` answers
      `"bootstrap":null`. Clear it (or paste
      `./scripts/bootstrap-db.sh && pnpm --filter @workspace/api-server run start`)
      and Deploy. Same check for **Custom Build Command**: empty.
- Check: three new rows; Source shows `production`; no custom start command.

## G. Vercel (15 min)

- [ ] vercel.com → `starsdecoded` → **Settings**.
- [ ] **Environment Variables** → `VITE_CLERK_PUBLISHABLE_KEY` → Edit → tick
      **Preview** alongside Production. After G6 every build of `main` is a
      Preview, and a build without this key is a blank page.
- [ ] **Automatically expose System Environment Variables**: on. The build
      reads `VERCEL_ENV` to show the "Staging" ribbon.
- [ ] **Domains** → **Add** `starsdecoded-staging.vercel.app` → Git branch
      `main`.
- [ ] **Deployment Protection** → Vercel Authentication → **Disabled**.
      Otherwise the smoke check and anyone with the link hit a login wall.
- [ ] **Git → Production Branch** → `production`. Same code as the live
      site; after this every build of `main` is a Preview.
- Check: the Clerk key shows Production and Preview; the staging domain is on
  `main`; protection is off.

## H. GitHub (10 min)

- [ ] Repository **Settings → General → Default branch** → `main`. Today it
      is an old `claude/…` branch.
- [ ] **Settings → Rules → Rulesets → New branch ruleset**
      `protect-production`, Active, target pattern `production`. Tick
      **Restrict deletions** and **Block force pushes** only. Leave
      **Require linear history** unticked (pull requests land on `main` as
      merge commits, and Promote fast-forwards those), and leave **Restrict
      updates** and **Require a pull request** unticked so the Promote
      workflow can push.
- Check: `main` is the default; the ruleset is Active.

## I. First sign-in on staging (5 min, after the PR is merged)

- [ ] Open `starsdecoded-staging.vercel.app`: amber "Staging" label bottom
      left. Blank page means G2.
- [ ] Sign in with the usual account (same Clerk instance). Reports from the
      live site do not appear; they are in the other database.
- [ ] `starsdecoded-staging.vercel.app/api/admin/me` says `"isAdmin":true`.
      If false, staging's `ADMIN_USER_ID` differs from production (E).
- [ ] Generate one report on staging.
- Check: `/admin/prompts` opens with Save buttons.

## J. Go live (Claude does this; the Owner approves)

- [ ] Tell Claude "runbook done through Part I" plus the Railway domain.
- [ ] Claude merges the pull request; the Smoke run on `main` turns green
      with `env: staging`. Test staging.
- [ ] Say "promote". Claude dispatches Promote: it re-checks staging, moves
      the `production` branch forward, waits for production, confirms
      `env: production`.
- Check: `starsdecoded.vercel.app/api/healthz` shows `"env":"production"`;
  `/admin/prompts` there shows no Save button and the read-only note.

## K. Stripe, later

- [ ] When the payments pull request exists, test-mode keys and a test
      webhook endpoint pointing at the staging address go into Railway
      `staging`; live keys into `production`.

## From now on

A merged change reaches staging within minutes and no customer. The Owner
tests, says "promote", and the same commit ships. Prompts: edit on staging,
check a report there, promote; production picks them up during its deploy. In
an emergency, `PROMPTS_READ_ONLY=false` on Railway production plus a redeploy
re-enables editing there.

## If something fails

| Symptom | Likely cause | Part |
|---|---|---|
| Staging page is blank | Preview Clerk key missing or added without redeploy | G |
| `/api/admin/me` says `isAdmin:false` | staging `ADMIN_USER_ID` or Clerk keys differ from production | E |
| Smoke says wrong `env` | `vercel.json` placeholder, or staging domain not on `main` | E, G |
| Staging asks for a Vercel login | Deployment Protection still on | G |
| Production deploy fails at "Promote prompt overrides" | source equals target, or staging database empty | F, A |
| `/api/healthz/db` says `"bootstrap":null` and `"tables":[]` | a custom start command in the Railway dashboard overrides `railway.json` | F |
| Staging log ends in `DATABASE_URL must be set` | variables added to the wrong environment | E |
| Promote refuses to run | ruleset restricts updates or requires a pull request | H |
