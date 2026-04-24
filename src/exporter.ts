import { PipedriveClient } from "./pipedrive/client.js";
import type {
  Template,
  TemplateCustomField,
  TemplatePipeline,
  TemplateActivityType,
} from "./template/schema.js";

type Entity = "deal" | "person" | "organization" | "product";

const FIELD_ENDPOINT: Record<Entity, string> = {
  deal: "/dealFields",
  person: "/personFields",
  organization: "/organizationFields",
  product: "/productFields",
};

/** Campos built-in que nunca devem ser clonados. */
function isCustom(f: { edit_flag?: boolean; key?: string }) {
  // Só campos criados pelo usuário têm edit_flag=true. Built-ins (title, value, etc.) não.
  return f.edit_flag === true;
}

/** Gera um ref estável a partir do nome + id. */
function slug(name: string, id: number | string) {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return `${base || "item"}_${id}`;
}

export async function exportTemplate(client: PipedriveClient): Promise<Template> {
  const [pipelinesRaw, stagesRaw, activityTypesRaw] = await Promise.all([
    client.get<any[]>("/pipelines"),
    client.get<any[]>("/stages"),
    client.get<any[]>("/activityTypes"),
  ]);

  const pipelines: TemplatePipeline[] = pipelinesRaw
    .sort((a, b) => a.order_nr - b.order_nr)
    .map((p) => ({
      ref: slug(p.name, p.id),
      name: p.name,
      order_nr: p.order_nr,
      deal_probability: !!p.deal_probability,
      stages: stagesRaw
        .filter((s) => s.pipeline_id === p.id)
        .sort((a, b) => a.order_nr - b.order_nr)
        .map((s) => ({
          ref: slug(s.name, s.id),
          name: s.name,
          order_nr: s.order_nr,
          deal_probability: s.deal_probability,
          rotten_flag: s.rotten_flag,
          rotten_days: s.rotten_days,
        })),
    }));

  const custom_fields = {
    deal: await exportFields(client, "deal"),
    person: await exportFields(client, "person"),
    organization: await exportFields(client, "organization"),
    product: await exportFields(client, "product"),
  };

  const activity_types: TemplateActivityType[] = activityTypesRaw
    .filter((a) => !a.is_custom_flag === false || a.is_custom_flag === true)
    .map((a) => ({
      ref: slug(a.name, a.id),
      name: a.name,
      icon_key: a.icon_key,
      color: a.color ?? null,
    }));

  return {
    version: "1.0",
    exported_at: new Date().toISOString(),
    pipelines,
    custom_fields,
    activity_types,
  };
}

async function exportFields(
  client: PipedriveClient,
  entity: Entity,
): Promise<TemplateCustomField[]> {
  const raw: any[] = [];
  for await (const f of client.paginate<any>(FIELD_ENDPOINT[entity])) raw.push(f);

  return raw.filter(isCustom).map((f) => ({
    ref: slug(f.name, f.id),
    name: f.name,
    field_type: f.field_type,
    add_visible_flag: f.add_visible_flag,
    mandatory_flag: f.mandatory_flag,
    options: Array.isArray(f.options)
      ? f.options.map((o: any) => ({ ref: slug(o.label, o.id), label: o.label }))
      : undefined,
  }));
}
