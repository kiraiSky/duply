import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { applyExportSelection, type ExportSelection } from "@/exporter";
import { Template } from "@/template/schema";

export async function POST(req: NextRequest) {
  const { name, template: rawTemplate, selection } = await req.json();

  if (!name || !rawTemplate || !selection) {
    return NextResponse.json(
      { error: "name, template e selection são obrigatórios" },
      { status: 400 },
    );
  }

  const safeName = name.replace(/[^a-z0-9-_]/gi, "_").slice(0, 60);

  try {
    const template = applyExportSelection(
      Template.parse(rawTemplate),
      selection as ExportSelection,
    );

    const dir = join(process.cwd(), "templates");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${safeName}.json`), JSON.stringify(template, null, 2), "utf8");

    return NextResponse.json({
      name: safeName,
      pipelines: template.pipelines.length,
      fields: Object.values(template.custom_fields).flat().length,
      activity_types: template.activity_types.length,
      lead_labels: template.lead_labels.length,
      saved_filters: template.saved_filters.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
