import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log("Creating in-memory PGlite database...");
  const pg = new PGlite();

  // Read and apply all migration files in order
  const migrationsDir = join(process.cwd(), "drizzle");
  const migrationFiles = [
    "0000_chilly_the_phantom.sql",
    "0001_last_warpath.sql",
    "0002_overjoyed_gressill.sql",
  ];

  for (const file of migrationFiles) {
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    // Split by statement-breakpoint comments and execute each statement
    const statements = sql.split("--> statement-breakpoint");
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed) {
        try {
          await pg.exec(trimmed);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`Error in ${file}: ${msg}`);
          console.error(`Statement: ${trimmed.substring(0, 100)}...`);
        }
      }
    }
    console.log(`Applied: ${file}`);
  }

  // Verify tables exist
  console.log("\n=== VERIFYING TABLES ===");
  const tables = await pg.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log("Tables found:", tables.rows.map((r: Record<string, unknown>) => r.table_name).join(", "));

  // Verify formDFilings columns
  console.log("\n=== form_d_filings COLUMNS ===");
  const fdCols = await pg.query(`
    SELECT column_name, data_type, is_nullable, character_maximum_length
    FROM information_schema.columns
    WHERE table_name = 'form_d_filings'
    ORDER BY ordinal_position
  `);
  for (const col of fdCols.rows) {
    const c = col as Record<string, unknown>;
    console.log(`  ${c.column_name}: ${c.data_type}${c.character_maximum_length ? `(${c.character_maximum_length})` : ""} ${c.is_nullable === "NO" ? "NOT NULL" : "nullable"}`);
  }

  // Verify filingEnrichments columns
  console.log("\n=== filing_enrichments COLUMNS ===");
  const feCols = await pg.query(`
    SELECT column_name, data_type, is_nullable, character_maximum_length
    FROM information_schema.columns
    WHERE table_name = 'filing_enrichments'
    ORDER BY ordinal_position
  `);
  for (const col of feCols.rows) {
    const c = col as Record<string, unknown>;
    console.log(`  ${c.column_name}: ${c.data_type}${c.character_maximum_length ? `(${c.character_maximum_length})` : ""} ${c.is_nullable === "NO" ? "NOT NULL" : "nullable"}`);
  }

  // Verify savedFilters columns
  console.log("\n=== saved_filters COLUMNS ===");
  const sfCols = await pg.query(`
    SELECT column_name, data_type, is_nullable, character_maximum_length
    FROM information_schema.columns
    WHERE table_name = 'saved_filters'
    ORDER BY ordinal_position
  `);
  for (const col of sfCols.rows) {
    const c = col as Record<string, unknown>;
    console.log(`  ${c.column_name}: ${c.data_type}${c.character_maximum_length ? `(${c.character_maximum_length})` : ""} ${c.is_nullable === "NO" ? "NOT NULL" : "nullable"}`);
  }

  // Verify auth tables still exist
  console.log("\n=== AUTH TABLES VERIFICATION ===");
  const authTables = ["user", "session", "account", "verification"];
  for (const t of authTables) {
    const res = await pg.query(`
      SELECT COUNT(*) as col_count
      FROM information_schema.columns
      WHERE table_name = '${t}'
    `);
    const row = res.rows[0] as Record<string, unknown>;
    console.log(`  ${t}: ${row.col_count} columns`);
  }

  // Verify indexes
  console.log("\n=== INDEXES ===");
  const indexes = await pg.query(`
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `);
  for (const idx of indexes.rows) {
    const i = idx as Record<string, unknown>;
    console.log(`  ${i.tablename}.${i.indexname}`);
  }

  // Verify foreign keys
  console.log("\n=== FOREIGN KEYS ===");
  const fks = await pg.query(`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_name
  `);
  for (const fk of fks.rows) {
    const f = fk as Record<string, unknown>;
    console.log(`  ${f.table_name}.${f.column_name} -> ${f.foreign_table_name}.${f.foreign_column_name}`);
  }

  console.log("\n=== ALL CHECKS PASSED ===");
  await pg.close();
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
