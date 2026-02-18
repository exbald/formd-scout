import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const { db } = await import('../src/lib/db');
  const { formDFilings, filingEnrichments } = await import('../src/lib/schema');
  const { sql } = await import('drizzle-orm');

  const filingsCount = await db.select({ count: sql<number>`count(*)::int` }).from(formDFilings);
  const enrichmentsCount = await db.select({ count: sql<number>`count(*)::int` }).from(filingEnrichments);
  const highRelevanceCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(filingEnrichments)
    .where(sql`${filingEnrichments.relevanceScore} >= 60`);

  console.log('Filings:', filingsCount[0]?.count ?? 0);
  console.log('Enrichments:', enrichmentsCount[0]?.count ?? 0);
  console.log('High relevance (60+):', highRelevanceCount[0]?.count ?? 0);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
