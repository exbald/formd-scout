import { spawnSync, statSync, chmodSync } from "child_process";
import path from "path";

const NATIVE_DIR = path.resolve("node_modules/@embedded-postgres/linux-x64/native");
const PG_CTL = path.join(NATIVE_DIR, "bin/pg_ctl");
const DATA_DIR = path.resolve("pg-data");
const LIB_DIR = path.join(NATIVE_DIR, "lib");

const st = statSync(PG_CTL);
const need = 0o555;
if ((st.mode & need) !== need) {
  chmodSync(PG_CTL, st.mode | need);
}

const env = { ...process.env, LD_LIBRARY_PATH: LIB_DIR };

console.log("Stopping PostgreSQL...");
const result = spawnSync(PG_CTL, ["stop", "-D", DATA_DIR, "-m", "fast", "-w"], {
  env,
  stdio: "inherit",
});

if (result.status === 0) {
  console.log("PostgreSQL stopped.");
} else {
  console.log("pg_ctl stop exited with code", result.status);
}
