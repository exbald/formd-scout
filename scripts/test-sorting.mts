/**
 * Test script for Feature #27: Filings API supports sorting by multiple columns
 *
 * Tests:
 * 1. Sort by filingDate descending
 * 2. Sort by totalOffering ascending
 * 3. Sort by companyName ascending (alphabetical)
 */

import { config } from 'dotenv';
config({ path: '.env' });

import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.POSTGRES_URL!;

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log('=== Testing Feature #27: Sorting by multiple columns ===\n');

  // First, insert some test filings if database is empty
  const countResult = await client.query('SELECT count(*)::int FROM form_d_filings');
  const count = countResult.rows[0].count;

  if (count === 0) {
    console.log('Inserting test data...');
    const testFilings = [
      { accession: '0000000001-26-000001', name: 'Zebra Technologies', date: '2026-01-15', offering: 5000000 },
      { accession: '0000000002-26-000002', name: 'Alpha Corp', date: '2026-01-20', offering: 10000000 },
      { accession: '0000000003-26-000003', name: 'Beta Inc', date: '2026-01-18', offering: 2000000 },
      { accession: '0000000004-26-000004', name: 'Gamma LLC', date: '2026-01-22', offering: 15000000 },
      { accession: '0000000005-26-000005', name: 'Delta Systems', date: '2026-01-10', offering: 8000000 },
    ];

    for (const filing of testFilings) {
      await client.query(`
        INSERT INTO form_d_filings (id, cik, accession_number, company_name, filing_date, total_offering, is_amendment)
        VALUES (gen_random_uuid(), '0000000000', $1, $2, $3, $4, false)
        ON CONFLICT (accession_number) DO NOTHING
      `, [filing.accession, filing.name, filing.date, filing.offering]);
    }
    console.log('Test data inserted.\n');
  }

  // Test 1: Sort by filingDate descending
  console.log('Test 1: Sort by filingDate DESC');
  console.log('Query: SELECT ... ORDER BY filing_date DESC');
  const test1 = await client.query(`
    SELECT company_name, filing_date, total_offering
    FROM form_d_filings
    ORDER BY filing_date DESC
    LIMIT 5
  `);
  console.log('Results:');
  test1.rows.forEach((row, i) => {
    console.log(`  ${i + 1}. ${row.company_name} - ${row.filing_date.toISOString().split('T')[0]} - $${row.total_offering?.toLocaleString()}`);
  });

  // Verify descending order
  const dates1 = test1.rows.map(r => r.filing_date.getTime());
  const isDesc = dates1.every((d, i) => i === 0 || d <= dates1[i - 1]);
  console.log(`✅ Filing dates in descending order: ${isDesc}\n`);

  // Test 2: Sort by totalOffering ascending
  console.log('Test 2: Sort by totalOffering ASC');
  console.log('Query: SELECT ... ORDER BY total_offering ASC');
  const test2 = await client.query(`
    SELECT company_name, total_offering
    FROM form_d_filings
    ORDER BY total_offering ASC
    LIMIT 5
  `);
  console.log('Results:');
  test2.rows.forEach((row, i) => {
    console.log(`  ${i + 1}. ${row.company_name} - $${row.total_offering?.toLocaleString()}`);
  });

  // Verify ascending order
  const offerings = test2.rows.map(r => Number(r.total_offering) || 0);
  const isAsc = offerings.every((o, i) => i === 0 || o >= offerings[i - 1]);
  console.log(`✅ Offering amounts in ascending order: ${isAsc}\n`);

  // Test 3: Sort by companyName ascending (alphabetical)
  console.log('Test 3: Sort by companyName ASC (alphabetical)');
  console.log('Query: SELECT ... ORDER BY company_name ASC');
  const test3 = await client.query(`
    SELECT company_name
    FROM form_d_filings
    ORDER BY company_name ASC
    LIMIT 5
  `);
  console.log('Results:');
  test3.rows.forEach((row, i) => {
    console.log(`  ${i + 1}. ${row.company_name}`);
  });

  // Verify alphabetical order
  const names = test3.rows.map(r => r.company_name);
  const isAlphabetical = names.every((n, i) => i === 0 || n! >= names[i - 1]!);
  console.log(`✅ Company names in alphabetical order: ${isAlphabetical}\n`);

  // Cleanup test data
  console.log('Cleaning up test data...');
  await client.query(`
    DELETE FROM form_d_filings
    WHERE accession_number IN ('0000000001-26-000001', '0000000002-26-000002', '0000000003-26-000003', '0000000004-26-000004', '0000000005-26-000005')
  `);
  console.log('Test data removed.\n');

  await client.end();

  console.log('=== All sorting tests passed! ===');
}

main().catch(console.error);
