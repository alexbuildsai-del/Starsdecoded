# services

Home for standalone services that hang off the core product — the "backbone"
being `api/` plus the Postgres database it owns.

**Nothing lives here yet.** The directory is a workspace root (`services/*` is
in `pnpm-workspace.yaml`), so each service is its own package and its own
deployment. Adding one is `mkdir services/<name>` with a `package.json`.

## What belongs here

Anything that reacts to what happens in the product rather than serving the
product's own UI:

- outbound integrations (push a completed report to an external system)
- scheduled work (nightly transit computation, retrograde-window refreshes)
- notification fan-out (email digests, mobile push)
- anything a third party runs against our data on their own schedule

What does not belong here: request-path logic the web or mobile client waits
on. That stays in `api/`.

## Reading events

There is no event bus yet — this is the piece to design before the first
service is written. Today the closest thing to an event log is the `reports`
table's `status` column and its `updatedAt` timestamp: a report moves
`pending → computing → interpreting → complete`, and a poller can watch for
rows that reached `complete`.

Two directions worth weighing when the first service lands:

1. **Poll the database.** Simplest. A service reads rows changed since its last
   cursor. No new infrastructure, no delivery guarantees to build, but every
   consumer needs database credentials and couples to the schema.
2. **Publish domain events.** `api/` writes an append-only `events` table (or
   pushes to a queue) as part of the transaction that changes state —
   `report.completed`, `invite.claimed`, `profile.created`. Consumers read the
   event stream and never touch product tables. More to build, but external
   consumers stop depending on our schema.

The second is the one that matches "external services read events" and is worth
the cost as soon as a consumer is outside our own deployment. Worth settling
the event shape before writing the first one, since it becomes an API.

## Configuration

Each service gets its own credentials. A service that only reads events should
get a read-only database role rather than the API's `DATABASE_URL`.
