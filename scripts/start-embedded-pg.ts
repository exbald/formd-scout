import EmbeddedPostgres from "embedded-postgres";

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: "./pg-data",
    user: "dev_user",
    password: "dev_password",
    port: 5432,
    persistent: true,
  });

  console.log("Starting embedded PostgreSQL...");
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("postgres_dev");
  console.log("PostgreSQL started on port 5432");
  console.log("Database: postgres_dev");
  console.log("Press Ctrl+C to stop");

  process.on("SIGINT", async () => {
    console.log("\nStopping PostgreSQL...");
    await pg.stop();
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}

main().catch(console.error);
