// Fails if any file under app/ contains a token that belongs to a specific subject.
// The platform must stay subject-agnostic; subject content lives only in prisma/seed-data/.
// Extend FORBIDDEN when a new subject is seeded.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "app");
const FORBIDDEN = [
  "bible",
  "biblearn",
  "genesis",
  'תנ"ך',
  "בראשית",
  "אברהם",
  "יעקב",
  "snunit",
  "sample-ltr",
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const offenders: string[] = [];
for (const file of walk(ROOT)) {
  const text = readFileSync(file, "utf8").toLowerCase();
  for (const token of FORBIDDEN) {
    if (text.includes(token.toLowerCase())) offenders.push(`${file}: "${token}"`);
  }
}

if (offenders.length > 0) {
  console.error("Subject-specific content found outside seed data:\n" + offenders.join("\n"));
  process.exit(1);
}
console.log("No subject leakage in app/.");
