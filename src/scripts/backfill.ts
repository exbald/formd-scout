// Backfill script - standalone execution: npx tsx src/scripts/backfill.ts
// TODO: Implement fetching last 30 days of Form D filings
// Uses same fetcher/parser functions from src/lib/edgar/
// Logs progress. Handles interruption via accessionNumber unique constraint.

async function main() {
  console.log("FormD Scout - Backfill Script");
  console.log("Fetching last 30 days of Form D filings...");
  // TODO: Implement backfill logic
}

main().catch(console.error);
