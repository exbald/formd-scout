import pg from "pg";
const { Pool } = pg;

async function checkData() {
  const client = new Pool({
    connectionString:
      process.env.POSTGRES_URL ||
      "postgresql://dev_user:dev_password@localhost:5432/postgres_dev",
  });

  try {
    // Check filing count
    const countRes = await client.query(
      "SELECT count(*)::int as count FROM form_d_filings"
    );
    console.log("Total filings:", countRes.rows[0].count);

    // Check sample filings
    const sampleRes = await client.query(
      "SELECT id, company_name, filing_date, industry_group, issuer_state, total_offering FROM form_d_filings LIMIT 5"
    );
    console.log("Sample filings:", JSON.stringify(sampleRes.rows, null, 2));

    // Check enrichment count
    const enrichRes = await client.query(
      "SELECT count(*)::int as count FROM filing_enrichments"
    );
    console.log("Total enrichments:", enrichRes.rows[0].count);

    // Check high relevance
    const highRelRes = await client.query(
      "SELECT count(*)::int as count FROM filing_enrichments WHERE relevance_score >= 60"
    );
    console.log("High relevance (>=60):", highRelRes.rows[0].count);

    // Check industries
    const indRes = await client.query(
      "SELECT industry_group, count(*)::int as count FROM form_d_filings WHERE industry_group IS NOT NULL GROUP BY industry_group ORDER BY count DESC LIMIT 5"
    );
    console.log("Top industries:", JSON.stringify(indRes.rows, null, 2));

    // Check states
    const stateRes = await client.query(
      "SELECT issuer_state, count(*)::int as count FROM form_d_filings WHERE issuer_state IS NOT NULL GROUP BY issuer_state ORDER BY count DESC LIMIT 5"
    );
    console.log("Top states:", JSON.stringify(stateRes.rows, null, 2));

    // Check average offering
    const avgRes = await client.query(
      "SELECT coalesce(avg(total_offering), 0)::text as avg FROM form_d_filings"
    );
    console.log("Average offering:", avgRes.rows[0].avg);

    // Check today's count
    const todayRes = await client.query(
      "SELECT count(*)::int as count FROM form_d_filings WHERE filing_date = CURRENT_DATE"
    );
    console.log("Today's filings:", todayRes.rows[0].count);

    // Check this week's count
    const weekRes = await client.query(
      "SELECT count(*)::int as count FROM form_d_filings WHERE filing_date >= date_trunc('week', CURRENT_DATE)"
    );
    console.log("This week's filings:", weekRes.rows[0].count);

    // Check this month's count
    const monthRes = await client.query(
      "SELECT count(*)::int as count FROM form_d_filings WHERE filing_date >= date_trunc('month', CURRENT_DATE)"
    );
    console.log("This month's filings:", monthRes.rows[0].count);
  } finally {
    await client.end();
  }
}

checkData().catch(console.error);
