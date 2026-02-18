import * as dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';

// Generate random filings for performance testing (1000+ records)
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
  'Industrial',
  'Media & Entertainment',
  'Education',
  'Other',
];

const states = [
  'CA', 'NY', 'TX', 'FL', 'MA', 'WA', 'IL', 'CO', 'PA', 'NJ',
  'AZ', 'GA', 'NC', 'VA', 'OH', 'MI', 'OR', 'MN', 'MD', 'CT'
];
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
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }

  const sql = postgres(connectionString);

  try {
    // Check current count
    const currentCount = await sql`SELECT COUNT(*) as count FROM form_d_filings`;
    const currentFilings = Number(currentCount[0].count);
    console.log(`Current filing count: ${currentFilings}`);

    // Target: 1100 filings (more than 1000 to ensure we're testing large datasets)
    const targetCount = 1100;
    const needed = targetCount - currentFilings;

    if (needed <= 0) {
      console.log(`Already have ${currentFilings} filings (>= ${targetCount}). No more needed.`);
      await sql.end();
      return;
    }

    console.log(`Creating ${needed} test filings to reach ${targetCount} total...`);

    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);

    // Create filings in batches of 50 for efficiency
    const batchSize = 50;
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < needed; i += batchSize) {
      const batch = Math.min(batchSize, needed - i);

      for (let j = 0; j < batch; j++) {
        const filingIndex = currentFilings + i + j + 1;
        const cik = String(Math.floor(1000000000 + Math.random() * 9000000000)).padStart(10, '0');
        const seqNum = String(filingIndex).padStart(6, '0');
        const accessionNumber = `${cik}-${today.getFullYear()}-${seqNum}`;
        const companyName = `Performance Test Co ${String(filingIndex).padStart(5, '0')} ${randomItem(['Inc.', 'Corp.', 'LLC', 'Holdings', 'Ventures', 'Group', 'Partners'])}`;
        const filingDate = randomDate(ninetyDaysAgo, today);
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
              ${isAmendment}, ${totalOffering}, ${industry}, ${state}, ${randomItem(['New York', 'San Francisco', 'Austin', 'Boston', 'Seattle', 'Denver', 'Miami', 'Chicago', 'Los Angeles', 'Atlanta'])}
            )
          `;
          created++;
        } catch (err) {
          // Skip duplicates
          if (String(err).includes('duplicate') || String(err).includes('unique')) {
            skipped++;
          } else {
            console.error(`Error inserting filing: ${err}`);
          }
        }
      }

      // Log progress every batch
      if ((i + batch) % 100 === 0 || i + batch >= needed) {
        console.log(`Progress: ${created} created, ${skipped} skipped, ${Math.min(i + batch, needed)}/${needed} processed...`);
      }
    }

    console.log(`\nFinished creating filings: ${created} created, ${skipped} skipped`);

    // Create enrichments for some of the new filings
    const filingsWithoutEnrichments = await sql`
      SELECT f.id FROM form_d_filings f
      LEFT JOIN filing_enrichments e ON f.id = e.filing_id
      WHERE e.id IS NULL
      LIMIT 800
    `;

    console.log(`Creating enrichments for ${filingsWithoutEnrichments.length} filings...`);

    let enrichmentsCreated = 0;
    for (let i = 0; i < filingsWithoutEnrichments.length; i++) {
      const filing = filingsWithoutEnrichments[i];
      // Give about 70% of filings enrichment with varying scores
      const relevanceScore = Math.random() > 0.3 ? Math.floor(Math.random() * 100) : null;

      if (relevanceScore !== null) {
        try {
          await sql`
            INSERT INTO filing_enrichments (
              filing_id, company_summary, relevance_score, relevance_reasoning,
              estimated_headcount, growth_signals, competitors, model_used
            ) VALUES (
              ${filing.id},
              ${`Performance test company summary for filing ${filing.id}. This is auto-generated test data.`},
              ${relevanceScore},
              ${`Test reasoning for relevance score of ${relevanceScore}.`},
              ${Math.floor(10 + Math.random() * 500)},
              ${['Growing team', 'Recent funding', 'Expansion plans', 'New product']},
              ${['Competitor A', 'Competitor B', 'Competitor C']},
              ${'perf-test-model'}
            )
          `;
          enrichmentsCreated++;
        } catch (err) {
          // Skip errors
        }
      }

      // Log progress
      if ((i + 1) % 100 === 0) {
        console.log(`Enrichments progress: ${enrichmentsCreated} created, ${i + 1}/${filingsWithoutEnrichments.length} processed...`);
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
    console.log(`Enrichments created this run: ${enrichmentsCreated}`);

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
