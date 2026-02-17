import EmbeddedPostgres from "embedded-postgres";

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: "./pg-data",
    user: "dev_user",
    password: "dev_password",
    port: 5432,
    persistent: true,
  });

  try {
    console.log("Initializing embedded PostgreSQL...");
    await pg.initialise();
    console.log("Starting PostgreSQL...");
    await pg.start();
    console.log("Creating database postgres_dev...");
    try {
      await pg.createDatabase("postgres_dev");
      console.log("Database created.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists")) {
        console.log("Database already exists, continuing.");
      } else {
        throw e;
      }
    }
    console.log("PostgreSQL is ready on port 5432!");
    console.log("PG_READY");
  } catch (err) {
    console.error("Failed to start PostgreSQL:", err);
    process.exit(1);
  }

  // Keep process alive
  process.on("SIGINT", async () => {
    await pg.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await pg.stop();
    process.exit(0);
  });

  // Keep alive indefinitely
  setInterval(() => {}, 60000);
}

main();
