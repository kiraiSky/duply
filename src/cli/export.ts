import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { PipedriveClient } from "../pipedrive/client.js";
import { exportTemplate } from "../exporter.js";

async function main() {
  const token = process.env.PIPEDRIVE_TOKEN;
  const domain = process.env.PIPEDRIVE_DOMAIN;
  const out = process.argv[2] ?? "templates/template.json";

  if (!token || !domain) {
    console.error("Faltam PIPEDRIVE_TOKEN e PIPEDRIVE_DOMAIN no ambiente.");
    process.exit(1);
  }

  const client = new PipedriveClient({ apiToken: token, domain });
  const template = await exportTemplate(client);

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(template, null, 2), "utf8");

  console.log(`✓ Template exportado para ${out}`);
  console.log(
    `  ${template.pipelines.length} pipelines, ` +
      `${Object.values(template.custom_fields).flat().length} campos customizados, ` +
      `${template.activity_types.length} tipos de atividade`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
