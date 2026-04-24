import { readFile } from "node:fs/promises";
import { PipedriveClient } from "../pipedrive/client.js";
import { cloneTemplate } from "../cloner.js";
import { Template } from "../template/schema.js";

async function main() {
  const token = process.env.PIPEDRIVE_TOKEN;
  const domain = process.env.PIPEDRIVE_DOMAIN;
  const templatePath = process.argv[2];

  if (!token || !domain || !templatePath) {
    console.error("Uso: PIPEDRIVE_TOKEN=... PIPEDRIVE_DOMAIN=... npm run clone <template.json>");
    process.exit(1);
  }

  const raw = JSON.parse(await readFile(templatePath, "utf8"));
  const template = Template.parse(raw);

  const client = new PipedriveClient({ apiToken: token, domain });
  const { report } = await cloneTemplate(client, template);

  console.log(`✓ Clone concluído: ${report.created.length} objetos criados`);
  if (report.skipped.length) {
    console.log(`  ${report.skipped.length} ignorados:`);
    for (const s of report.skipped) console.log(`   - ${s.kind} ${s.ref}: ${s.reason}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
