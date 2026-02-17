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
  "SELECT id, accession_number, company_name, cik, filing_date, total_offering, industry_group, issuer_state FROM form_d_filings WHERE accession_number = $1",
  ["RESTART_TEST_12345"]
);

if (result.rows.length > 0) {
  console.log("FOUND test data:", JSON.stringify(result.rows[0], null, 2));
} else {
  console.log("NOT FOUND - test data missing!");
}

// Also show total count
const countResult = await client.query("SELECT count(*) as total FROM form_d_filings");
console.log("Total filings:", countResult.rows[0].total);

await client.end();
