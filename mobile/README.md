# mobile

Expo (React Native) client for Starsdecoded. **Scaffold only** — no screens have been
built yet. Nothing was ported here from Replit; the Replit project was web-only.

## Deploy target

Expo / EAS. The app talks to the `api/` deployment (Railway) over HTTPS — it does not
talk to the database directly.

## Getting started

This directory is an empty workspace package. Initialise the Expo app in place:

```sh
cd mobile && pnpm create expo-app@latest . --template blank-typescript
```

Keep the package `name` as `mobile` so the root `dev:mobile` script keeps working.

## Configuration

| Variable              | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | Base URL of the `api/` deployment, e.g. `https://api.starsdecoded.com` |

`EXPO_PUBLIC_*` variables are inlined into the client bundle at build time, so never
put a secret in one.

## Sharing code with web

`packages/api-zod` (request/response schemas) and `packages/api-spec` (the OpenAPI
document) are platform-neutral and can be consumed here directly.
`packages/api-client-react` is React Query based and should work under React Native,
but its `custom-fetch` may need a base-URL override since there is no dev proxy on
device.

Auth is Clerk on web; use `@clerk/clerk-expo` here rather than `@clerk/react`.
