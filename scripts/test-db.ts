import postgres from "postgres";

async function main() {
  const urls = [
    "postgresql://dev_user:dev_password@localhost:5432/postgres_dev",
    "postgresql://dev_user:dev_password@127.0.0.1:5432/postgres_dev",
    "postgresql://postgres:postgres@localhost:5432/postgres_dev",
    "postgresql://postgres:postgres@localhost:5432/postgres",
    "postgresql://autoforge@localhost:5432/postgres",
    "postgresql://dev_user:dev_password@localhost:5432/postgres",
  ];

  for (const url of urls) {
    try {
      console.log("Trying:", url);
      const sql = postgres(url, { connect_timeout: 3 });
      const result = await sql`SELECT 1 as connected`;
      console.log("  SUCCESS! Connected:", result[0].connected === 1);

      const tables = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      console.log("  Tables:", tables.map(t => t.table_name).join(", ") || "(none)");

      const dbs = await sql`SELECT datname FROM pg_database WHERE datistemplate = false`;
      console.log("  Databases:", dbs.map(d => d.datname).join(", "));

      await sql.end();
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log("  FAILED:", msg.split("\n")[0]);
    }
  }
  console.log("All connection attempts failed");
  process.exit(1);
}

main();
