import { NextRequest, NextResponse } from "next/server";
import { PipedriveClient } from "@/pipedrive/client";
import { buildDefaultExportSelection, exportTemplate, type ExportCategories } from "@/exporter";

export async function POST(req: NextRequest) {
  const { token, domain, categories } = await req.json();

  if (!token || !domain) {
    return NextResponse.json({ error: "token e domain são obrigatórios" }, { status: 400 });
  }

  try {
    const client = new PipedriveClient({ apiToken: token, domain });
    const template = await exportTemplate(client, categories as ExportCategories | undefined);

    return NextResponse.json({
      template,
      selection: buildDefaultExportSelection(template),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
