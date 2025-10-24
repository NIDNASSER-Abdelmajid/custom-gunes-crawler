const fs = require("fs");
const path = require("path");
const importFromJSON = require("./importFromJSON");

async function ingest(dirPath, csvMappingPath) {
  const absDir = path.resolve(dirPath);
  const files = fs.readdirSync(absDir).filter((f) => f.endsWith(".json"));
  console.log(`Found ${files.length} JSON files in ${absDir}`);
  for (const f of files) {
    const full = path.join(absDir, f);
    console.log(`Importing ${full} ...`);
    await importFromJSON(full, csvMappingPath);
  }
}

if (require.main === module) {
  const dir = process.argv[2] || "./data";
  const csv =
    process.argv[3] || path.resolve(process.cwd(), "Tranco-categorizer.csv");
  ingest(dir, csv)
    .then(() => {
      console.log("Ingestion completed.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Ingestion failed:", err);
      process.exit(1);
    });
}

module.exports = ingest;
