import * as dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';

// Generate random filings for performance testing
const industries = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Real Estate',
  'Consumer Products',
  'Energy',
  'Manufacturing',
  'Biotechnology',
  'Software',
  'E-Commerce',
];

const states = ['CA', 'NY', 'TX', 'FL', 'MA', 'WA', 'IL', 'CO', 'PA', 'NJ'];
const entityTypes = ['Corporation', 'LLC', 'LP', 'LLP', 'PBC'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function randomAmount(): number {
  const amounts = [500000, 1000000, 2500000, 5000000, 10000000, 25000000, 50000000, 100000000];
  return randomItem(amounts) * (0.5 + Math.random());
}

async function main() {
  const connectionString = process.env.POSTGRES_URL || '';
  const sql = postgres(connectionString);

  try {
    // Check current count
    const currentCount = await sql`SELECT COUNT(*) as count FROM form_d_filings`;
    console.log(`Current filing count: ${currentCount[0].count}`);

    const targetCount = 150; // Aim for 150 filings to exceed 100 requirement
    const needed = targetCount - Number(currentCount[0].count);

    if (needed <= 0) {
      console.log('Already have enough filings for performance testing.');
      await sql.end();
      return;
    }

    console.log(`Creating ${needed} test filings...`);

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Create filings in batches of 20
    const batchSize = 20;
    let created = 0;

    for (let i = 0; i < needed; i += batchSize) {
      const batch = Math.min(batchSize, needed - i);

      for (let j = 0; j < batch; j++) {
        const cik = String(Math.floor(1000000000 + Math.random() * 9000000000)).padStart(10, '0');
        const seqNum = String(i + j + 1).padStart(6, '0');
        const accessionNumber = `${cik}-${today.getFullYear()}-${seqNum}`;
        const companyName = `Test Company ${String(i + j + 1).padStart(4, '0')} ${randomItem(['Inc.', 'Corp.', 'LLC', 'Holdings', 'Ventures'])}`;
        const filingDate = randomDate(thirtyDaysAgo, today);
        const industry = randomItem(industries);
        const state = randomItem(states);
        const entityType = randomItem(entityTypes);
        const totalOffering = randomAmount();
        const isAmendment = Math.random() > 0.85;

        try {
          await sql`
            INSERT INTO form_d_filings (
              cik, accession_number, company_name, entity_type, filing_date,
              is_amendment, total_offering, industry_group, issuer_state, issuer_city
            ) VALUES (
              ${cik}, ${accessionNumber}, ${companyName}, ${entityType}, ${filingDate},
              ${isAmendment}, ${totalOffering}, ${industry}, ${state}, ${state === 'NY' ? 'New York' : randomItem(['San Francisco', 'Austin', 'Boston', 'Seattle', 'Denver'])}
            )
          `;
          created++;
        } catch (err) {
          // Skip duplicates
          if (String(err).includes('duplicate')) {
            console.log(`Skipping duplicate: ${accessionNumber}`);
          } else {
            throw err;
          }
        }
      }

      console.log(`Created ${created}/${needed} filings...`);
    }

    // Also create some enrichments for relevance scoring
    const filingsWithoutEnrichments = await sql`
      SELECT f.id FROM form_d_filings f
      LEFT JOIN filing_enrichments e ON f.id = e.filing_id
      WHERE e.id IS NULL
    `;

    console.log(`Creating enrichments for ${filingsWithoutEnrichments.length} filings...`);

    for (let i = 0; i < filingsWithoutEnrichments.length; i++) {
      const filing = filingsWithoutEnrichments[i];
      // Give about 60% of filings enrichment with varying scores
      const relevanceScore = Math.random() > 0.4 ? Math.floor(Math.random() * 100) : null;

      if (relevanceScore !== null) {
        await sql`
          INSERT INTO filing_enrichments (
            filing_id, company_summary, relevance_score, relevance_reasoning,
            estimated_headcount, growth_signals, competitors, model_used
          ) VALUES (
            ${filing.id},
            ${`Test company summary for filing ${filing.id}. This is a sample AI-generated company description.`},
            ${relevanceScore},
            ${`Sample reasoning for relevance score of ${relevanceScore}.`},
            ${Math.floor(10 + Math.random() * 500)},
            ${['NYC-based', 'Series B', 'Growing team', 'Recent funding']},
            ${['Competitor A', 'Competitor B']},
            ${'test-model'}
          )
        `;
      }
    }

    // Final count
    const finalCount = await sql`SELECT COUNT(*) as count FROM form_d_filings`;
    const enrichmentCount = await sql`SELECT COUNT(*) as count FROM filing_enrichments`;
    const highRelevanceCount = await sql`SELECT COUNT(*) as count FROM filing_enrichments WHERE relevance_score >= 60`;

    console.log('\n=== Database Seeded Successfully ===');
    console.log(`Total filings: ${finalCount[0].count}`);
    console.log(`Total enrichments: ${enrichmentCount[0].count}`);
    console.log(`High relevance (60+): ${highRelevanceCount[0].count}`);

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
