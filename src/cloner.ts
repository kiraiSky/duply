import { PipedriveClient } from "./pipedrive/client.js";
import type { Template, TemplateCustomField } from "./template/schema.js";

type Entity = "deal" | "person" | "organization" | "product";

const FIELD_ENDPOINT: Record<Entity, string> = {
  deal: "/dealFields",
  person: "/personFields",
  organization: "/organizationFields",
  product: "/productFields",
};

export type CloneContext = {
  pipelines: Map<string, number>;
  stages: Map<string, number>;
  customFields: Map<string, { id: number; key: string }>;
  fieldOptions: Map<string, number>; // "<field_ref>.<option_ref>" → new_option_id
  activityTypes: Map<string, number>;
};

export type CloneReport = {
  created: { kind: string; ref: string; id: number }[];
  skipped: { kind: string; ref: string; reason: string }[];
};

function emptyContext(): CloneContext {
  return {
    pipelines: new Map(),
    stages: new Map(),
    customFields: new Map(),
    fieldOptions: new Map(),
    activityTypes: new Map(),
  };
}

export async function cloneTemplate(
  client: PipedriveClient,
  template: Template,
): Promise<{ ctx: CloneContext; report: CloneReport }> {
  const ctx = emptyContext();
  const report: CloneReport = { created: [], skipped: [] };

  // 1. Pipelines + 2. Stages
  for (const p of template.pipelines) {
    const created = await client.post<any>("/pipelines", {
      name: p.name,
      order_nr: p.order_nr,
      deal_probability: p.deal_probability ? 1 : 0,
    });
    ctx.pipelines.set(p.ref, created.id);
    report.created.push({ kind: "pipeline", ref: p.ref, id: created.id });

    for (const s of p.stages) {
      const stage = await client.post<any>("/stages", {
        name: s.name,
        pipeline_id: created.id,
        order_nr: s.order_nr,
        deal_probability: s.deal_probability,
        rotten_flag: s.rotten_flag ? 1 : 0,
        rotten_days: s.rotten_days ?? undefined,
      });
      ctx.stages.set(s.ref, stage.id);
      report.created.push({ kind: "stage", ref: s.ref, id: stage.id });
    }
  }

  // 3. Custom fields por entidade
  for (const entity of ["deal", "person", "organization", "product"] as Entity[]) {
    for (const f of template.custom_fields[entity]) {
      await createField(client, entity, f, ctx, report);
    }
  }

  // 4. Activity types
  for (const a of template.activity_types) {
    const created = await client.post<any>("/activityTypes", {
      name: a.name,
      icon_key: a.icon_key,
      color: a.color ?? undefined,
    });
    ctx.activityTypes.set(a.ref, created.id);
    report.created.push({ kind: "activity_type", ref: a.ref, id: created.id });
  }

  return { ctx, report };
}

async function createField(
  client: PipedriveClient,
  entity: Entity,
  f: TemplateCustomField,
  ctx: CloneContext,
  report: CloneReport,
) {
  const body: Record<string, unknown> = {
    name: f.name,
    field_type: f.field_type,
    add_visible_flag: f.add_visible_flag,
  };

  if (f.options?.length) {
    // API aceita options como array de { label }; ordem é preservada.
    body.options = f.options.map((o) => ({ label: o.label }));
  }

  const created = await client.post<any>(FIELD_ENDPOINT[entity], body);
  ctx.customFields.set(f.ref, { id: created.id, key: created.key });
  report.created.push({ kind: `field.${entity}`, ref: f.ref, id: created.id });

  // Mapear options criadas de volta pelos refs originais, pela ordem.
  if (f.options?.length && Array.isArray(created.options)) {
    f.options.forEach((opt, i) => {
      const newOpt = created.options[i];
      if (newOpt?.id != null) {
        ctx.fieldOptions.set(`${f.ref}.${opt.ref}`, newOpt.id);
      }
    });
  }
}
