import { db } from '../src/lib/db';
import { formDFilings } from '../src/lib/schema';
import { sql, ilike } from 'drizzle-orm';

async function testSearch() {
  // Get sample filings to see what company names exist
  const sampleFilings = await db.select({
    companyName: formDFilings.companyName,
  }).from(formDFilings).limit(5);

  console.log('Sample company names in database:');
  sampleFilings.forEach((f, i) => console.log(`  ${i + 1}. ${f.companyName}`));

  // Count total filings
  const countResult = await db.select({ count: sql<number>`count(*)::int` }).from(formDFilings);
  const total = countResult[0]?.count ?? 0;
  console.log(`\nTotal filings: ${total}`);

  if (total === 0) {
    console.log('No filings in database - nothing to test');
    process.exit(0);
  }

  // Test 1: Search for a partial company name
  const firstCompany = sampleFilings[0]?.companyName;
  if (firstCompany) {
    // Use first 3-5 characters for partial search
    const partialName = firstCompany.substring(0, Math.min(5, firstCompany.length));

    const searchResults = await db.select({
      companyName: formDFilings.companyName,
    }).from(formDFilings).where(ilike(formDFilings.companyName, `%${partialName}%`));

    console.log(`\nTest 1: Search for "${partialName}" (partial of "${firstCompany}")`);
    console.log(`  Results: ${searchResults.length}`);

    if (searchResults.length > 0) {
      console.log('  PASS: Found matching filings');
    } else {
      console.log('  FAIL: No results for partial name search');
    }
  }

  // Test 2: Search for non-existent company
  const nonExistentResults = await db.select({
    companyName: formDFilings.companyName,
  }).from(formDFilings).where(ilike(formDFilings.companyName, '%XYZNONEXISTENT123%'));

  console.log('\nTest 2: Search for non-existent company "XYZNONEXISTENT123"');
  console.log(`  Results: ${nonExistentResults.length}`);

  if (nonExistentResults.length === 0) {
    console.log('  PASS: Empty results array returned (not error)');
  } else {
    console.log('  FAIL: Should return empty array');
  }

  // Test 3: Case-insensitive search
  if (firstCompany) {
    const lowerCase = firstCompany.toLowerCase();
    const upperCase = firstCompany.toUpperCase();

    const lowerResults = await db.select({
      companyName: formDFilings.companyName,
    }).from(formDFilings).where(ilike(formDFilings.companyName, `%${lowerCase.substring(0, 5)}%`));

    const upperResults = await db.select({
      companyName: formDFilings.companyName,
    }).from(formDFilings).where(ilike(formDFilings.companyName, `%${upperCase.substring(0, 5)}%`));

    console.log('\nTest 3: Case-insensitive search');
    console.log(`  Lowercase "${lowerCase.substring(0, 5)}": ${lowerResults.length} results`);
    console.log(`  Uppercase "${upperCase.substring(0, 5)}": ${upperResults.length} results`);

    if (lowerResults.length === upperResults.length && lowerResults.length > 0) {
      console.log('  PASS: Case-insensitive search works');
    } else {
      console.log('  FAIL: Case sensitivity issue');
    }
  }

  process.exit(0);
}

testSearch().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
