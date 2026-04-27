import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PipedriveClient } from "@/pipedrive/client";
import { Template } from "@/template/schema";
import { applyExportSelection, type ExportSelection } from "@/exporter";
import type { CloneReport } from "@/cloner";

export async function POST(req: NextRequest) {
  const { token, domain, templateName, selection } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      function send(data: object) {
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        send({ type: "log", msg: `Carregando template "${templateName}"...` });

        const raw = JSON.parse(
          await readFile(join(process.cwd(), "templates", `${templateName}.json`), "utf8"),
        );
        const template = Template.parse(raw);

        const filteredTemplate = selection
          ? applyExportSelection(template, selection as ExportSelection)
          : template;

        send({ type: "log", msg: `Conectando a ${domain}.pipedrive.com...` });
        const client = new PipedriveClient({ apiToken: token, domain });

        send({ type: "log", msg: "Iniciando clonagem..." });
        const { report }: { report: CloneReport } = await cloneWithProgress(
          client,
          filteredTemplate,
          send,
        );

        send({
          type: "done",
          created: report.created.length,
          skipped: report.skipped.length,
        });
      } catch (error: unknown) {
        send({ type: "error", msg: error instanceof Error ? error.message : String(error) });
      } finally {
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function cloneWithProgress(
  client: PipedriveClient,
  template: Template,
  send: (d: object) => void,
): Promise<{ report: CloneReport }> {
  const { cloneTemplate } = await import("@/cloner");

  send({ type: "log", msg: `Criando ${template.pipelines.length} pipeline(s)...` });
  const result = await cloneTemplate(client, template);

  for (const item of result.report.created) {
    send({ type: "log", msg: `OK ${item.kind} "${item.ref}" (id ${item.id})` });
  }
  for (const item of result.report.skipped) {
    send({ type: "log", msg: `- ${item.kind} "${item.ref}" ignorado: ${item.reason}` });
  }

  return result;
}
