import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

/**
 * DATABASE_SSL=require means TLS without checking Supabase's certificate
 * chain, the ssl option the API's pool passes (src/index.ts). drizzle-kit
 * hands pg a url as a bare connection string, with no ssl option beside it,
 * and pg would let the url's sslmode decide anyway, so the url is taken apart
 * and the pool's option goes with its parts. Other query parameters have no
 * place in drizzle-kit's credentials. Without DATABASE_SSL the url goes as given.
 */
export function pushCredentials(databaseUrl: string, databaseSsl: string | undefined) {
  if (databaseSsl !== "require") return { url: databaseUrl };
  const url = new URL(databaseUrl);
  const user = decodeURIComponent(url.username);
  return {
    host: url.hostname.replace(/^\[(.*)\]$/, "$1"),
    ...(url.port ? { port: Number(url.port) } : {}),
    ...(user ? { user } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    database: decodeURIComponent(url.pathname.slice(1)) || user,
    ssl: { rejectUnauthorized: false },
  };
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: pushCredentials(process.env.DATABASE_URL, process.env.DATABASE_SSL),
});
