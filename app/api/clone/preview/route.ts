import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Template } from "@/template/schema";
import { buildDefaultExportSelection } from "@/exporter";

export async function POST(req: NextRequest) {
  const { templateName } = await req.json();

  if (!templateName) {
    return NextResponse.json({ error: "templateName é obrigatório" }, { status: 400 });
  }

  try {
    const raw = JSON.parse(
      await readFile(join(process.cwd(), "templates", `${templateName}.json`), "utf8"),
    );
    const template = Template.parse(raw);

    return NextResponse.json({
      template,
      selection: buildDefaultExportSelection(template),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
