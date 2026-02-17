import postgres from 'postgres';

const client = postgres('postgresql://dev_user:dev_password@localhost:5432/postgres_dev');

async function test() {
  try {
    // Check filings count
    const filingsResult = await client`SELECT count(*)::int as count FROM form_d_filings`;
    console.log('Filings count:', filingsResult[0].count);

    // Check enrichments count
    const enrichResult = await client`SELECT count(*)::int as count FROM filing_enrichments`;
    console.log('Enrichments count:', enrichResult[0].count);

    // Get a sample of filings with enrichment data (LEFT JOIN)
    const sample = await client`
      SELECT
        f.id,
        f.company_name,
        f.filing_date,
        f.total_offering,
        f.industry_group,
        f.issuer_state,
        e.id as enrichment_id,
        e.relevance_score
      FROM form_d_filings f
      LEFT JOIN filing_enrichments e ON f.id = e.filing_id
      LIMIT 5
    `;
    console.log('\nSample filings with enrichment (LEFT JOIN):');
    sample.forEach((row, i) => {
      console.log(`${i + 1}. ${row.company_name} - Offering: ${row.total_offering}, Industry: ${row.industry_group}, Relevance: ${row.relevance_score ?? 'NULL'}`);
    });

    // Check if we have both enriched and unenriched filings
    const enriched = await client`
      SELECT count(*)::int as count FROM form_d_filings f
      JOIN filing_enrichments e ON f.id = e.filing_id
    `;
    const unenriched = await client`
      SELECT count(*)::int as count FROM form_d_filings f
      LEFT JOIN filing_enrichments e ON f.id = e.filing_id
      WHERE e.id IS NULL
    `;
    console.log(`\nEnriched: ${enriched[0].count}, Unenriched: ${unenriched[0].count}`);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}

test();
