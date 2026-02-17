import postgres from "postgres";

async function main() {
  const url = process.env.POSTGRES_URL || "postgresql://dev_user:dev_password@localhost:5433/postgres_dev";
  console.log("Connecting to:", url);
  const sql = postgres(url, { connect_timeout: 5 });

  const result = await sql`SELECT 1 as connected`;
  console.log("DB connected:", result[0].connected === 1);

  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  console.log("Existing tables:", tables.map(t => t.table_name).join(", ") || "(none)");

  await sql.end();
}

main().catch((err) => {
  console.error("DB connection failed:", err.message || err);
  process.exit(1);
});
