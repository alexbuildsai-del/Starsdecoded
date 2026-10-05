/**
 * The payment tables (ADR-274 to 279, 315): purchases, one per checkout;
 * stripe_events, each Stripe event once; subscriptions, Timeline's plan as
 * Stripe mirrors it; campaigns, the admin's price campaigns; testers, the
 * accounts whose credits are granted, the QA pair among them; and qa_walks,
 * the staging walk's verdicts. None references another table, so each is made
 * whatever else exists. The columns this round adds to existing tables are
 * migrate-payments-columns.ts's, in step 1.
 *
 * The schema push runs before this script and usually makes all six first, so
 * the DDL is the schema's own, every name included, and whichever makes them
 * the other finds no drift.
 *
 * Run with: tsx packages/db/scripts/migrate-add-payments.ts
 *
 * Idempotent: Railway runs the bootstrap on every start (R-7.3).
 */
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ...(process.env.DATABASE_SSL === "require" ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id                    text PRIMARY KEY NOT NULL,
        user_id               text NOT NULL,
        kind                  text NOT NULL,
        item                  text NOT NULL,
        cents                 integer NOT NULL,
        full_cents            integer NOT NULL,
        campaign_id           text,
        stripe_session_id     text,
        stripe_payment_intent text,
        stripe_invoice        text,
        stripe_subscription   text,
        tick_hash             text NOT NULL,
        ticked_at             timestamp with time zone NOT NULL,
        return_to             text NOT NULL,
        status                text NOT NULL,
        is_test               boolean NOT NULL,
        receipt_delivered     boolean,
        granted_at            timestamp with time zone,
        refunded_at           timestamp with time zone,
        created_at            timestamp with time zone NOT NULL DEFAULT now(),
        updated_at            timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS purchases_stripe_session_id_idx ON purchases (stripe_session_id)`,
    );
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS purchases_stripe_invoice_idx ON purchases (stripe_invoice)`);
    await client.query(`CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON purchases (user_id)`);
    await client.query(
      `CREATE INDEX IF NOT EXISTS purchases_stripe_payment_intent_idx ON purchases (stripe_payment_intent)`,
    );
    console.log("Table purchases and its indexes present.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS stripe_events (
        id           text PRIMARY KEY NOT NULL,
        type         text NOT NULL,
        livemode     boolean NOT NULL,
        received_at  timestamp with time zone NOT NULL DEFAULT now(),
        processed_at timestamp with time zone
      );
    `);
    console.log("Table stripe_events present.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id                   text PRIMARY KEY NOT NULL,
        user_id              text NOT NULL,
        customer_id          text NOT NULL,
        item                 text NOT NULL,
        status               text NOT NULL,
        current_period_end   timestamp with time zone,
        cancel_at_period_end boolean NOT NULL DEFAULT false,
        is_test              boolean NOT NULL,
        created_at           timestamp with time zone NOT NULL DEFAULT now(),
        updated_at           timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id)`);
    console.log("Table subscriptions and its index present.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id         text PRIMARY KEY NOT NULL,
        name       text NOT NULL,
        audience   text NOT NULL,
        slug       text,
        starts_on  date NOT NULL,
        ends_on    date NOT NULL,
        prices     jsonb NOT NULL,
        coupons    jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_by text NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        ended_at   timestamp with time zone
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS campaigns_slug_idx ON campaigns (slug)`);
    console.log("Table campaigns and its index present.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS testers (
        user_id  text PRIMARY KEY NOT NULL,
        email    text NOT NULL,
        qa       text,
        added_by text NOT NULL,
        added_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("Table testers present.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS qa_walks (
        id          text PRIMARY KEY NOT NULL,
        sha         text NOT NULL,
        mode        text NOT NULL,
        status      text NOT NULL,
        steps       jsonb NOT NULL,
        findings    jsonb NOT NULL,
        started_at  timestamp with time zone NOT NULL DEFAULT now(),
        finished_at timestamp with time zone
      );
    `);
    console.log("Table qa_walks present.");

    console.log("Migration complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
