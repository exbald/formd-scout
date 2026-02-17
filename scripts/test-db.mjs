import postgres from "postgres";

const sql = postgres("postgresql://dev_user:dev_password@localhost:5432/postgres_dev", {
  connect_timeout: 5,
});

try {
  const result = await sql`SELECT current_database() as db, version() as ver`;
  console.log("DB connected:", JSON.stringify(result));
  await sql.end();
  process.exit(0);
} catch (e) {
  console.log("DB error:", e.message);
  await sql.end();
  process.exit(1);
}
