// Load environment variables BEFORE importing db
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  // Dynamic import after env is loaded
  const { db } = await import('../src/lib/db');
  const { formDFilings, filingEnrichments } = await import('../src/lib/schema');
  const { sql } = await import('drizzle-orm');

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
  const cities: Record<string, string[]> = {
    CA: ['San Francisco', 'Los Angeles', 'Palo Alto', 'Mountain View'],
    NY: ['New York', 'Brooklyn', 'Albany'],
    TX: ['Austin', 'Houston', 'Dallas'],
    FL: ['Miami', 'Tampa', 'Orlando'],
    MA: ['Boston', 'Cambridge', 'Somerville'],
    WA: ['Seattle', 'Bellevue', 'Redmond'],
    IL: ['Chicago', 'Evanston'],
    CO: ['Denver', 'Boulder'],
    PA: ['Philadelphia', 'Pittsburgh'],
    NJ: ['Jersey City', 'Newark', 'Princeton'],
  };

  function randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomDate(start: Date, end: Date): string {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
  }

  function randomAmount(): string {
    const amounts = [500000, 1000000, 2500000, 5000000, 10000000, 25000000, 50000000, 100000000];
    return String(Math.floor(randomItem(amounts) * (0.5 + Math.random())));
  }

  try {
    // Check current count
    const currentCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formDFilings);

    console.log(`Current filing count: ${currentCount[0]?.count ?? 0}`);

    const targetCount = 150; // Aim for 150 filings to exceed 100 requirement
    const needed = targetCount - (currentCount[0]?.count ?? 0);

    if (needed <= 0) {
      console.log('Already have enough filings for performance testing.');
      return;
    }

    console.log(`Creating ${needed} test filings...`);

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Create filings
    let created = 0;
    const filingIds: string[] = [];

    for (let i = 0; i < needed; i++) {
      const cik = String(Math.floor(1000000000 + Math.random() * 9000000000)).padStart(10, '0');
      const seqNum = String(i + 1).padStart(6, '0');
      const year = today.getFullYear();
      const accessionNumber = `${cik}-${year}-${seqNum}`;
      const companyName = `Test Company ${String(i + 1).padStart(4, '0')} ${randomItem(['Inc.', 'Corp.', 'LLC', 'Holdings', 'Ventures'])}`;
      const filingDate = randomDate(thirtyDaysAgo, today);
      const industry = randomItem(industries);
      const state = randomItem(states);
      const entityType = randomItem(entityTypes);
      const totalOffering = randomAmount();
      const isAmendment = Math.random() > 0.85;
      const city = randomItem(cities[state] || ['Unknown']);

      try {
        const [inserted] = await db
          .insert(formDFilings)
          .values({
            cik,
            accessionNumber,
            companyName,
            entityType,
            filingDate: new Date(filingDate),
            isAmendment,
            totalOffering,
            industryGroup: industry,
            issuerState: state,
            issuerCity: city,
          })
          .returning({ id: formDFilings.id });

        if (inserted) {
          filingIds.push(inserted.id);
          created++;
        }
      } catch (err) {
        // Skip duplicates
        if (String(err).includes('duplicate') || String(err).includes('unique')) {
          console.log(`Skipping duplicate: ${accessionNumber}`);
        } else {
          throw err;
        }
      }

      // Log progress every 20 filings
      if ((i + 1) % 20 === 0) {
        console.log(`Created ${created}/${needed} filings...`);
      }
    }

    console.log(`Created ${created} filings.`);

    // Create enrichments for some filings (about 60% with varying scores)
    console.log(`Creating enrichments for ${filingIds.length} filings...`);

    let enrichmentsCreated = 0;
    for (const filingId of filingIds) {
      // Give about 60% of filings enrichment with varying scores
      if (Math.random() > 0.4) {
        const relevanceScore = Math.floor(Math.random() * 100);

        await db.insert(filingEnrichments).values({
          filingId,
          companySummary: `Test company summary for filing ${filingId}. This is a sample AI-generated company description.`,
          relevanceScore,
          relevanceReasoning: `Sample reasoning for relevance score of ${relevanceScore}.`,
          estimatedHeadcount: Math.floor(10 + Math.random() * 500),
          growthSignals: ['NYC-based', 'Series B', 'Growing team', 'Recent funding'],
          competitors: ['Competitor A', 'Competitor B'],
          modelUsed: 'test-model',
        });
        enrichmentsCreated++;
      }
    }

    // Final count
    const finalCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formDFilings);

    const enrichmentCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(filingEnrichments);

    const highRelevanceCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(filingEnrichments)
      .where(sql`${filingEnrichments.relevanceScore} >= 60`);

    console.log('\n=== Database Seeded Successfully ===');
    console.log(`Total filings: ${finalCount[0]?.count ?? 0}`);
    console.log(`Total enrichments: ${enrichmentCount[0]?.count ?? 0}`);
    console.log(`High relevance (60+): ${highRelevanceCount[0]?.count ?? 0}`);
    console.log(`Enrichments created: ${enrichmentsCreated}`);
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

main().catch(console.error);
