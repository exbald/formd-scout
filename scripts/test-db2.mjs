import pg from "pg";
const { Client } = pg;

const client = new Client({
  user: "dev_user",
  password: "dev_password",
  port: 5432,
  host: "localhost",
  database: "postgres_dev",
});

try {
  await client.connect();
  const res = await client.query("SELECT current_database() as db, version() as ver");
  console.log("Connected:", JSON.stringify(res.rows));
  await client.end();
  process.exit(0);
} catch (e) {
  console.log("Error:", e.message);
  process.exit(1);
}
