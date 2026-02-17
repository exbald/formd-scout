import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const connectionString = process.env.POSTGRES_URL || '';
  const sql = postgres(connectionString);

  const filings = await sql`SELECT id, company_name, filing_date FROM form_d_filings LIMIT 5`;
  console.log('Filings in DB:', filings.length);
  if (filings.length > 0) {
    console.log('Sample:', JSON.stringify(filings[0], null, 2));
  }

  const enrichments = await sql`SELECT COUNT(*) as count FROM filing_enrichments`;
  console.log('Enrichments:', enrichments[0].count);

  await sql.end();
}

main().catch(console.error);
