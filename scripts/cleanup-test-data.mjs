import pg from "pg";
const { Client } = pg;

const client = new Client({
  user: "dev_user",
  password: "dev_password",
  port: 5432,
  host: "localhost",
  database: "postgres_dev",
});

await client.connect();

const result = await client.query(
  "DELETE FROM form_d_filings WHERE accession_number = $1 RETURNING accession_number",
  ["RESTART_TEST_12345"]
);

console.log("Deleted rows:", result.rowCount);

const countResult = await client.query("SELECT count(*) as total FROM form_d_filings");
console.log("Remaining filings:", countResult.rows[0].total);

await client.end();
