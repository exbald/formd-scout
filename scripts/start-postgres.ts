import EmbeddedPostgres from "embedded-postgres";
import path from "path";

async function main() {
  const dbDir = path.resolve("/app/generations/cbre/pg-data");
  console.log("Database dir:", dbDir);

  const pg = new EmbeddedPostgres({
    databaseDir: dbDir,
    user: "dev_user",
    password: "dev_password",
    port: 5432,
    persistent: true,
  });

  console.log("Step 1: Initialising...");
  await pg.initialise();
  console.log("Step 2: Starting...");
  await pg.start();
  console.log("Step 3: PostgreSQL started on port 5432");

  console.log("Step 4: Creating database postgres_dev...");
  await pg.createDatabase("postgres_dev");
  console.log("Step 5: Database created!");

  console.log("READY - PostgreSQL running on port 5432");

  process.on("SIGINT", async () => {
    await pg.stop();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await pg.stop();
    process.exit(0);
  });

  setInterval(() => {}, 1000);
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
