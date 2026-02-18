import * as dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';

async function main() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL not set');
  }

  const sql = postgres(connectionString);

  try {
    const result = await sql`SELECT COUNT(*) as count FROM form_d_filings`;
    console.log('Total filings:', result[0].count);

    const enrichResult = await sql`SELECT COUNT(*) as count FROM filing_enrichments`;
    console.log('Total enrichments:', enrichResult[0].count);
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
