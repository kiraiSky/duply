import { exportSavedFilters, fetchFilterFieldCatalog } from "./filters";
import { PipedriveClient } from "./pipedrive/client";
import { slugRef } from "./template/refs";
import type {
  Template,
  TemplateActivityType,
  TemplateCustomField,
  TemplateLeadLabel,
  TemplatePipeline,
} from "./template/schema";

type Entity = "deal" | "person" | "organization" | "product" | "lead";

const FIELD_ENDPOINT: Record<Entity, string> = {
  deal: "/dealFields",
  person: "/personFields",
  organization: "/organizationFields",
  product: "/productFields",
  lead: "/leadFields",
};

const DEFAULT_LEAD_LABELS = new Set(["hot", "warm", "cold"]);
const DEFAULT_ACTIVITY_TYPE_NAMES = new Set([
  "call",
  "meeting",
  "task",
  "deadline",
  "email",
  "lunch",
]);

function isCustom(f: { edit_flag?: boolean }) {
  return f.edit_flag === true;
}

export type ExportCategories = {
  pipelines: boolean;
  fields_deal: boolean;
  fields_person: boolean;
  fields_org: boolean;
  fields_product: boolean;
  fields_lead: boolean;
  activity_types: boolean;
  lead_labels: boolean;
  filters: boolean;
};

export const DEFAULT_EXPORT_CATEGORIES: ExportCategories = {
  pipelines: true,
  fields_deal: true,
  fields_person: true,
  fields_org: true,
  fields_product: true,
  fields_lead: false,
  activity_types: true,
  lead_labels: true,
  filters: false,
};

export type ExportSelection = {
  pipelines: string[];
  custom_fields: {
    deal: string[];
    person: string[];
    organization: string[];
    product: string[];
    lead: string[];
  };
  activity_types: string[];
  lead_labels: string[];
  saved_filters: string[];
};

export async function exportTemplate(
  client: PipedriveClient,
  categories: ExportCategories = DEFAULT_EXPORT_CATEGORIES,
): Promise<Template> {
  const needsPipelines = categories.pipelines;
  const needsFilters = categories.filters;
  const needsActivityTypes = categories.activity_types;
  const needsLeadLabels = categories.lead_labels || needsFilters;

  const [pipelinesRaw, stagesRaw, activityTypesRaw, leadLabelsRaw, filterFieldCatalog] =
    await Promise.all([
      needsPipelines ? client.get<any[]>("/pipelines") : Promise.resolve([]),
      needsPipelines ? client.get<any[]>("/stages") : Promise.resolve([]),
      needsActivityTypes ? client.get<any[]>("/activityTypes") : Promise.resolve([]),
      needsLeadLabels ? client.get<any[]>("/leadLabels").catch(() => [] as any[]) : Promise.resolve([]),
      needsFilters ? fetchFilterFieldCatalog(client) : Promise.resolve({} as Record<string, any[]>),
    ]);

  const pipelines: TemplatePipeline[] = pipelinesRaw
    .sort((a, b) => a.order_nr - b.order_nr)
    .map((pipeline) => ({
      ref: slugRef(pipeline.name, pipeline.id),
      name: pipeline.name,
      order_nr: pipeline.order_nr,
      deal_probability: !!pipeline.deal_probability,
      stages: stagesRaw
        .filter((stage) => stage.pipeline_id === pipeline.id)
        .sort((a, b) => a.order_nr - b.order_nr)
        .map((stage) => ({
          ref: slugRef(stage.name, stage.id),
          name: stage.name,
          order_nr: stage.order_nr,
          deal_probability: stage.deal_probability,
          rotten_flag: stage.rotten_flag,
          rotten_days: stage.rotten_days,
        })),
    }));

  const custom_fields = {
    deal: categories.fields_deal ? await exportFields(client, "deal") : [],
    person: categories.fields_person ? await exportFields(client, "person") : [],
    organization: categories.fields_org ? await exportFields(client, "organization") : [],
    product: categories.fields_product ? await exportFields(client, "product") : [],
    lead: categories.fields_lead ? await exportFields(client, "lead").catch(() => []) : [],
  };

  const activity_types: TemplateActivityType[] = activityTypesRaw
    .map((activityType) => ({
      ref: slugRef(activityType.name, activityType.id),
      name: activityType.name,
      icon_key: activityType.icon_key,
      color: activityType.color ?? null,
    }))
    .filter(isCustomActivityType);

  const lead_labels: TemplateLeadLabel[] = (leadLabelsRaw ?? [])
    .filter((leadLabel) => !isDefaultLeadLabel(leadLabel.name))
    .map((leadLabel) => ({
      ref: slugRef(leadLabel.name, leadLabel.id),
      name: leadLabel.name,
      color: leadLabel.color,
    }));

  const { filters: saved_filters } = needsFilters
    ? await exportSavedFilters(client, filterFieldCatalog, pipelinesRaw, stagesRaw, leadLabelsRaw ?? [])
    : { filters: [] };

  return {
    version: "1.0",
    exported_at: new Date().toISOString(),
    pipelines,
    custom_fields,
    activity_types,
    lead_labels,
    saved_filters,
  };
}

export function buildDefaultExportSelection(template: Template): ExportSelection {
  return {
    pipelines: template.pipelines.map((pipeline) => pipeline.ref),
    custom_fields: {
      deal: template.custom_fields.deal.map((field) => field.ref),
      person: template.custom_fields.person.map((field) => field.ref),
      organization: template.custom_fields.organization.map((field) => field.ref),
      product: template.custom_fields.product.map((field) => field.ref),
      lead: template.custom_fields.lead.map((field) => field.ref),
    },
    activity_types: template.activity_types.map((activityType) => activityType.ref),
    lead_labels: template.lead_labels.map((leadLabel) => leadLabel.ref),
    saved_filters: [],
  };
}

export function applyExportSelection(template: Template, selection: ExportSelection): Template {
  return {
    ...template,
    pipelines: template.pipelines.filter((pipeline) => selection.pipelines.includes(pipeline.ref)),
    custom_fields: {
      deal: filterByRef(template.custom_fields.deal, selection.custom_fields.deal),
      person: filterByRef(template.custom_fields.person, selection.custom_fields.person),
      organization: filterByRef(template.custom_fields.organization, selection.custom_fields.organization),
      product: filterByRef(template.custom_fields.product, selection.custom_fields.product),
      lead: filterByRef(template.custom_fields.lead, selection.custom_fields.lead),
    },
    activity_types: filterByRef(template.activity_types, selection.activity_types),
    lead_labels: filterByRef(template.lead_labels, selection.lead_labels),
    saved_filters: filterByRef(template.saved_filters, selection.saved_filters),
  };
}

function filterByRef<T extends { ref: string }>(items: T[], refs: string[]) {
  const selectedRefs = new Set(refs);
  return items.filter((item) => selectedRefs.has(item.ref));
}

function isCustomActivityType(activityType: {
  name?: string;
  key_string?: string;
  is_custom_flag?: boolean;
}) {
  if (activityType.is_custom_flag === true) return true;
  const name = normalizeValue(activityType.name);
  const key = normalizeValue(activityType.key_string);
  return !DEFAULT_ACTIVITY_TYPE_NAMES.has(name) && !DEFAULT_ACTIVITY_TYPE_NAMES.has(key);
}

function isDefaultLeadLabel(name: string | undefined) {
  return DEFAULT_LEAD_LABELS.has(normalizeValue(name));
}

function normalizeValue(value: string | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function exportFields(
  client: PipedriveClient,
  entity: Entity,
): Promise<TemplateCustomField[]> {
  const raw: any[] = [];
  for await (const field of client.paginate<any>(FIELD_ENDPOINT[entity])) raw.push(field);

  const custom = raw.filter(isCustom);
  // Monetary fields auto-generate a companion currency field (key: "<parent>_currency").
  // Pipedrive creates it automatically when the monetary field is cloned, so exporting
  // it separately would cause a duplicate. Filter them out by matching the key pattern.
  const monetaryKeys = new Set(custom.filter((f) => f.field_type === "monetary").map((f) => f.key));
  const withoutCurrencyCompanions = custom.filter(
    (f) => !(typeof f.key === "string" && f.key.endsWith("_currency") && monetaryKeys.has(f.key.slice(0, -9))),
  );

  return withoutCurrencyCompanions.map((field) => ({
    ref: slugRef(field.name, field.id),
    name: field.name,
    field_type: field.field_type,
    field_group_id: readGroupId(field),
    field_group_name: readGroupName(field),
    add_visible_flag: field.add_visible_flag,
    mandatory_flag: field.mandatory_flag === true,
    options: Array.isArray(field.options)
      ? field.options.map((option: any) => ({
          ref: slugRef(option.label, option.id),
          label: option.label,
        }))
      : undefined,
  }));
}

// Pipedrive v1 returns group_id as an integer on each field.
// There is no public API endpoint to resolve group IDs to names,
// so the name falls back to "Grupo {N}" unless the field itself carries it.
function readGroupId(field: Record<string, unknown>): number | null {
  const v = field.field_group_id ?? field.group_id;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function readGroupName(field: Record<string, unknown>): string | null {
  // Name from a nested field_group object (undocumented but checked opportunistically)
  const nested = field.field_group;
  if (nested && typeof nested === "object") {
    const n = (nested as Record<string, unknown>).name;
    if (typeof n === "string" && n.trim()) return n.trim();
  }
  // Name as a flat string property
  for (const key of ["field_group_name", "group_name"] as const) {
    const n = field[key];
    if (typeof n === "string" && n.trim()) return n.trim();
  }
  // Fall back to group ID label
  const id = readGroupId(field);
  if (id == null) return null;
  if (id === 0) return "Summary";
  return `Grupo ${id}`;
}
