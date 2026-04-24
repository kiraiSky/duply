import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { PipedriveClient } from "@/pipedrive/client";
import { exportTemplate } from "@/exporter";

export async function POST(req: NextRequest) {
  const { token, domain, name } = await req.json();

  if (!token || !domain || !name) {
    return NextResponse.json({ error: "token, domain e name são obrigatórios" }, { status: 400 });
  }

  const safeName = name.replace(/[^a-z0-9-_]/gi, "_").slice(0, 60);

  try {
    const client = new PipedriveClient({ apiToken: token, domain });
    const template = await exportTemplate(client);

    const dir = join(process.cwd(), "templates");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${safeName}.json`), JSON.stringify(template, null, 2), "utf8");

    return NextResponse.json({
      name: safeName,
      pipelines: template.pipelines.length,
      fields: Object.values(template.custom_fields).flat().length,
      activity_types: template.activity_types.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
