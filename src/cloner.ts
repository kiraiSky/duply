import { createSavedFilters } from "./filters";
import { PipedriveClient } from "./pipedrive/client";
import type { Template, TemplateCustomField } from "./template/schema";

type Entity = "deal" | "person" | "organization" | "product" | "lead";

const FIELD_ENDPOINT: Record<Entity, string> = {
  deal: "/dealFields",
  person: "/personFields",
  organization: "/organizationFields",
  product: "/productFields",
  lead: "/leadFields",
};

export type CloneContext = {
  pipelines: Map<string, number>;
  stages: Map<string, number>;
  customFields: Map<string, { id: number; key: string }>;
  fieldOptions: Map<string, number>;
  activityTypes: Map<string, number>;
  leadLabels: Map<string, string>;
  filters: Map<string, number>;
};

export type CloneReport = {
  created: { kind: string; ref: string; id: number | string }[];
  skipped: { kind: string; ref: string; reason: string }[];
};

function emptyContext(): CloneContext {
  return {
    pipelines: new Map(),
    stages: new Map(),
    customFields: new Map(),
    fieldOptions: new Map(),
    activityTypes: new Map(),
    leadLabels: new Map(),
    filters: new Map(),
  };
}

export async function cloneTemplate(
  client: PipedriveClient,
  template: Template,
): Promise<{ ctx: CloneContext; report: CloneReport }> {
  const ctx = emptyContext();
  const report: CloneReport = { created: [], skipped: [] };

  for (const pipeline of template.pipelines) {
    const createdPipeline = await client.post<any>("/pipelines", {
      name: pipeline.name,
      order_nr: pipeline.order_nr,
      deal_probability: pipeline.deal_probability ? 1 : 0,
    });
    ctx.pipelines.set(pipeline.ref, createdPipeline.id);
    report.created.push({ kind: "pipeline", ref: pipeline.ref, id: createdPipeline.id });

    for (const stage of pipeline.stages) {
      const createdStage = await client.post<any>("/stages", {
        name: stage.name,
        pipeline_id: createdPipeline.id,
        order_nr: stage.order_nr,
        deal_probability: stage.deal_probability,
        rotten_flag: stage.rotten_flag ? 1 : 0,
        rotten_days: stage.rotten_days ?? undefined,
      });
      ctx.stages.set(stage.ref, createdStage.id);
      report.created.push({ kind: "stage", ref: stage.ref, id: createdStage.id });
    }
  }

  for (const entity of ["deal", "person", "organization", "product", "lead"] as Entity[]) {
    const fields = template.custom_fields[entity] ?? [];
    for (const field of fields) {
      await createField(client, entity, field, ctx, report);
    }
  }

  for (const activityType of template.activity_types) {
    const createdActivityType = await client.post<any>("/activityTypes", {
      name: activityType.name,
      icon_key: activityType.icon_key,
      color: activityType.color ?? undefined,
    });
    ctx.activityTypes.set(activityType.ref, createdActivityType.id);
    report.created.push({
      kind: "activity_type",
      ref: activityType.ref,
      id: createdActivityType.id,
    });
  }

  for (const leadLabel of template.lead_labels ?? []) {
    const createdLeadLabel = await client.post<any>("/leadLabels", {
      name: leadLabel.name,
      color: leadLabel.color,
    });
    ctx.leadLabels.set(leadLabel.ref, createdLeadLabel.id);
    report.created.push({ kind: "lead_label", ref: leadLabel.ref, id: createdLeadLabel.id });
  }

  const savedFilters = await createSavedFilters(client, template.saved_filters ?? [], ctx);
  for (const createdFilter of savedFilters.created) {
    ctx.filters.set(createdFilter.ref, createdFilter.id);
    report.created.push({ kind: "filter", ref: createdFilter.ref, id: createdFilter.id });
  }
  for (const skippedFilter of savedFilters.skipped) {
    report.skipped.push({
      kind: "filter",
      ref: skippedFilter.ref,
      reason: skippedFilter.reason,
    });
  }

  return { ctx, report };
}

async function createField(
  client: PipedriveClient,
  entity: Entity,
  field: TemplateCustomField,
  ctx: CloneContext,
  report: CloneReport,
) {
  const body: Record<string, unknown> = {
    name: field.name,
    field_type: field.field_type,
    add_visible_flag: field.add_visible_flag,
  };

  if (field.mandatory_flag) body.mandatory_flag = true;

  if (field.options?.length) {
    body.options = field.options.map((option) => ({ label: option.label }));
  }

  const created = await client.post<any>(FIELD_ENDPOINT[entity], body);
  ctx.customFields.set(field.ref, { id: created.id, key: created.key });
  report.created.push({ kind: `field.${entity}`, ref: field.ref, id: created.id });

  if (field.options?.length && Array.isArray(created.options)) {
    field.options.forEach((option, index) => {
      const createdOption = created.options[index];
      if (createdOption?.id != null) {
        ctx.fieldOptions.set(`${field.ref}.${option.ref}`, createdOption.id);
      }
    });
  }
}
