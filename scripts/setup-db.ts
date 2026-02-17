import postgres from "postgres";

async function main() {
  // Connect as dev_user (the superuser from initdb) with auth=trust on port 5432
  const sql = postgres("postgresql://dev_user@localhost:5432/postgres", { connect_timeout: 5 });

  console.log("Connected to PostgreSQL on port 5432");

  // Create postgres_dev database if not exists
  const dbs = await sql`SELECT datname FROM pg_database WHERE datname = 'postgres_dev'`;
  if (dbs.length === 0) {
    await sql`CREATE DATABASE postgres_dev OWNER dev_user`;
    console.log("Created database: postgres_dev");
  } else {
    console.log("Database postgres_dev already exists");
  }

  // Set password for dev_user
  await sql`ALTER ROLE dev_user WITH PASSWORD 'dev_password'`;
  console.log("Set password for dev_user");

  await sql.end();

  // Verify connection with full credentials
  const devSql = postgres("postgresql://dev_user:dev_password@localhost:5432/postgres_dev", { connect_timeout: 5 });
  const result = await devSql`SELECT 1 as connected`;
  console.log("dev_user connection to postgres_dev verified:", result[0].connected === 1);
  await devSql.end();

  console.log("Database setup complete!");
}

main().catch((e) => {
  console.error("Setup failed:", e.message || e);
  process.exit(1);
});
