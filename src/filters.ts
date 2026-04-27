import { PipedriveClient } from "./pipedrive/client";
import { slugRef } from "./template/refs";
import type {
  TemplateLeadLabel,
  TemplateSavedFilter,
  TemplateSavedFilterCondition,
} from "./template/schema";

type FilterType = "deals" | "leads" | "org" | "people" | "products" | "activity" | "projects";
type FilterObject = "deal" | "person" | "organization" | "product" | "lead" | "activity";

type FilterField = {
  id: number;
  key?: string;
  name: string;
  edit_flag?: boolean;
  options?: Array<{ id: number; label: string }>;
};

type FilterConditionRaw = {
  object: string;
  field_id: number | string;
  operator: string;
  value?: unknown;
  extra_value?: string | null;
};

type FilterConditionGroupRaw = {
  glue: string;
  conditions: FilterConditionRaw[];
};

type FilterConditionsRaw = {
  glue: string;
  conditions: FilterConditionGroupRaw[];
};

type FilterSummaryRaw = {
  id: number;
  name: string;
  type: FilterType;
};

type FilterDetailRaw = FilterSummaryRaw & {
  conditions: FilterConditionsRaw;
};

type ExportFilterResult = {
  filters: TemplateSavedFilter[];
  skipped: Array<{ name: string; reason: string }>;
};

type DestinationFilterFieldCatalog = Map<string, Map<string, number>>;
type ParsedValueList = {
  values: Array<string | number>;
  shape: "scalar" | "array" | "csv";
};
type OptionValueResult =
  | { kind: "none" }
  | { kind: "single"; refs: string[]; shape: "scalar" | "array" | "csv" }
  | { kind: "many"; refs: string[]; shape: "scalar" | "array" | "csv" }
  | { reason: string };

const FILTER_FIELD_ENDPOINT: Record<FilterObject, string> = {
  deal: "/dealFields",
  person: "/personFields",
  organization: "/organizationFields",
  product: "/productFields",
  lead: "/leadFields",
  activity: "/activityFields",
};

export async function fetchFilterFieldCatalog(
  client: PipedriveClient,
): Promise<Record<FilterObject, FilterField[]>> {
  const objects = Object.keys(FILTER_FIELD_ENDPOINT) as FilterObject[];
  const entries = await Promise.all(
    objects.map(async (object) => {
      try {
        const rows: FilterField[] = [];
        for await (const field of client.paginate<FilterField>(FILTER_FIELD_ENDPOINT[object])) {
          rows.push(field);
        }
        return [object, rows] as const;
      } catch {
        return [object, []] as const;
      }
    }),
  );

  return Object.fromEntries(entries) as Record<FilterObject, FilterField[]>;
}

export async function exportSavedFilters(
  client: PipedriveClient,
  sourceFields: Record<FilterObject, FilterField[]>,
  sourcePipelines: Array<{ id: number; name: string }>,
  sourceStages: Array<{ id: number; name: string }>,
  rawLeadLabels: Array<{ id: string | number; name: string }>,
): Promise<ExportFilterResult> {
  const summaries = await client.get<FilterSummaryRaw[]>("/filters").catch(() => []);
  const filters: TemplateSavedFilter[] = [];
  const skipped: Array<{ name: string; reason: string }> = [];
  const pipelinesById = new Map(sourcePipelines.map((pipeline) => [String(pipeline.id), pipeline]));
  const stagesById = new Map(sourceStages.map((stage) => [String(stage.id), stage]));
  // Build lookup from raw API id (string or number) → template ref.
  // Lead label IDs in Pipedrive are UUIDs, so we can't extract them from refs.
  const leadLabelsById = new Map(
    rawLeadLabels.map((label) => [String(label.id), { ref: slugRef(label.name, label.id) }]),
  );
  const fieldsByObject = buildSourceFieldCatalog(sourceFields);

  for (const summary of summaries) {
    let detail: FilterDetailRaw;
    try {
      detail = await client.get<FilterDetailRaw>(`/filters/${summary.id}`);
    } catch (error) {
      skipped.push({
        name: summary.name,
        reason: error instanceof Error ? error.message : "Falha ao buscar detalhes do filtro",
      });
      continue;
    }

    const groups: TemplateSavedFilter["conditions"]["conditions"] = [];
    let unsupportedReason: string | null = null;

    for (const group of detail.conditions?.conditions ?? []) {
      const mappedConditions: TemplateSavedFilterCondition[] = [];
      for (const condition of group.conditions ?? []) {
        const result = normalizeCondition(
          condition,
          fieldsByObject,
          pipelinesById,
          stagesById,
          leadLabelsById,
        );
        if ("reason" in result) {
          unsupportedReason = result.reason;
          break;
        }
        mappedConditions.push(result.condition);
      }

      if (unsupportedReason) break;
      groups.push({ glue: group.glue, conditions: mappedConditions });
    }

    if (unsupportedReason) {
      skipped.push({ name: summary.name, reason: unsupportedReason });
      continue;
    }

    filters.push({
      ref: slugRef(summary.name, summary.id),
      name: summary.name,
      type: summary.type,
      conditions: {
        glue: detail.conditions?.glue ?? "and",
        conditions: groups,
      },
    });
  }

  return { filters, skipped };
}

export async function createSavedFilters(
  client: PipedriveClient,
  filters: TemplateSavedFilter[],
  ctx: {
    pipelines: Map<string, number>;
    stages: Map<string, number>;
    customFields: Map<string, { id: number; key: string }>;
    fieldOptions: Map<string, number>;
    leadLabels: Map<string, string>;
  },
): Promise<{
  created: Array<{ ref: string; id: number }>;
  skipped: Array<{ ref: string; reason: string }>;
}> {
  const destinationCatalog = buildDestinationFieldCatalog(await fetchFilterFieldCatalog(client));
  const created: Array<{ ref: string; id: number }> = [];
  const skipped: Array<{ ref: string; reason: string }> = [];

  for (const filter of filters) {
    try {
      const conditions = materializeConditions(filter, destinationCatalog, ctx);
      const createdFilter = await client.post<{ id: number }>("/filters", {
        name: filter.name,
        type: filter.type,
        conditions,
      });
      created.push({ ref: filter.ref, id: createdFilter.id });
    } catch (error) {
      skipped.push({
        ref: filter.ref,
        reason: error instanceof Error ? error.message : "Falha ao criar filtro",
      });
    }
  }

  return { created, skipped };
}

function normalizeCondition(
  condition: FilterConditionRaw,
  fieldsByObject: Map<string, Map<string, FilterField>>,
  pipelinesById: Map<string, { id: number; name: string }>,
  stagesById: Map<string, { id: number; name: string }>,
  leadLabelsById: Map<string, { ref: string }>,
):
  | { condition: TemplateSavedFilterCondition }
  | { reason: string } {
  const fields = fieldsByObject.get(condition.object);
  const field = fields?.get(String(condition.field_id));
  if (!field?.key) {
    return { reason: `Campo ${condition.field_id} do objeto ${condition.object} não foi encontrado` };
  }

  const base = {
    object: condition.object,
    operator: condition.operator,
    extra_value: condition.extra_value ?? null,
    field_key: field.key,
  };

  if (field.edit_flag) {
    const fieldRef = slugRef(field.name, field.id);
    const optionResult = mapOptionValue(condition.value, field.options ?? []);
    if ("reason" in optionResult) return { reason: optionResult.reason };
    if (optionResult.kind === "single") {
      return {
        condition: {
          ...base,
          field_ref: fieldRef,
          value_kind: "field_option",
          value_ref: optionResult.refs[0],
          value_shape: optionResult.shape,
        },
      };
    }
    if (optionResult.kind === "many") {
      return {
        condition: {
          ...base,
          field_ref: fieldRef,
          value_kind: "field_options",
          value_refs: optionResult.refs,
          value_shape: optionResult.shape,
        },
      };
    }

    return {
      condition: {
        ...base,
        field_ref: fieldRef,
        value_kind: "literal",
        value: sanitizeLiteral(condition.value),
      },
    };
  }

  if (field.key === "pipeline_id") {
    const pipeline = pipelinesById.get(String(condition.value));
    if (!pipeline) return { reason: `Pipeline ${condition.value} não pôde ser remapeado` };
    return {
      condition: {
        ...base,
        value_kind: "pipeline",
        value_ref: slugRef(pipeline.name, pipeline.id),
      },
    };
  }

  if (field.key === "stage_id") {
    const stage = stagesById.get(String(condition.value));
    if (!stage) return { reason: `Etapa ${condition.value} não pôde ser remapeada` };
    return {
      condition: {
        ...base,
        value_kind: "stage",
        value_ref: slugRef(stage.name, stage.id),
      },
    };
  }

  if (field.key === "label_ids") {
    const labels = parseIdList(condition.value, leadLabelsById);
    if ("reason" in labels) return labels;
    if (labels.refs.length === 1) {
      return {
        condition: {
          ...base,
          value_kind: "lead_label",
          value_ref: labels.refs[0],
          value_shape: labels.shape,
        },
      };
    }
    return {
      condition: {
        ...base,
        value_kind: "lead_labels",
        value_refs: labels.refs,
        value_shape: labels.shape,
      },
    };
  }

  return {
    condition: {
      ...base,
      value_kind: "literal",
      value: sanitizeLiteral(condition.value),
    },
  };
}

function materializeConditions(
  filter: TemplateSavedFilter,
  destinationCatalog: DestinationFilterFieldCatalog,
  ctx: {
    pipelines: Map<string, number>;
    stages: Map<string, number>;
    customFields: Map<string, { id: number; key: string }>;
    fieldOptions: Map<string, number>;
    leadLabels: Map<string, string>;
  },
) {
  return {
    glue: filter.conditions.glue,
    conditions: filter.conditions.conditions.map((group) => ({
      glue: group.glue,
      conditions: group.conditions.map((condition) =>
        materializeCondition(condition, destinationCatalog, ctx),
      ),
    })),
  };
}

function materializeCondition(
  condition: TemplateSavedFilterCondition,
  destinationCatalog: DestinationFilterFieldCatalog,
  ctx: {
    pipelines: Map<string, number>;
    stages: Map<string, number>;
    customFields: Map<string, { id: number; key: string }>;
    fieldOptions: Map<string, number>;
    leadLabels: Map<string, string>;
  },
) {
  const fieldId = condition.field_ref
    ? ctx.customFields.get(condition.field_ref)?.id
    : destinationCatalog.get(condition.object)?.get(condition.field_key);

  if (!fieldId) {
    throw new Error(`Campo de destino não encontrado para ${condition.object}.${condition.field_key}`);
  }

  return {
    object: condition.object,
    field_id: fieldId,
    operator: condition.operator,
    value: materializeValue(condition, ctx),
    extra_value: condition.extra_value ?? null,
  };
}

function materializeValue(
  condition: TemplateSavedFilterCondition,
  ctx: {
    pipelines: Map<string, number>;
    stages: Map<string, number>;
    customFields: Map<string, { id: number; key: string }>;
    fieldOptions: Map<string, number>;
    leadLabels: Map<string, string>;
  },
) {
  switch (condition.value_kind) {
    case "literal":
      return condition.value ?? null;
    case "pipeline":
      return requireRef(ctx.pipelines, condition.value_ref, "pipeline");
    case "stage":
      return requireRef(ctx.stages, condition.value_ref, "stage");
    case "field_option":
      return requireRef(
        ctx.fieldOptions,
        condition.value_ref && condition.field_ref
          ? `${condition.field_ref}.${condition.value_ref}`
          : undefined,
        "opção de campo",
      );
    case "field_options": {
      const refs = (condition.value_refs ?? []).map((ref) =>
        requireRef(
          ctx.fieldOptions,
          condition.field_ref ? `${condition.field_ref}.${ref}` : undefined,
          "opção de campo",
        ),
      );
      return shapeList(refs, condition.value_shape);
    }
    case "lead_label":
      return requireRef(ctx.leadLabels, condition.value_ref, "lead label");
    case "lead_labels": {
      const refs = (condition.value_refs ?? []).map((ref) =>
        requireRef(ctx.leadLabels, ref, "lead label"),
      );
      return shapeList(refs, condition.value_shape);
    }
  }
}

function buildSourceFieldCatalog(sourceFields: Record<FilterObject, FilterField[]>) {
  const catalog = new Map<string, Map<string, FilterField>>();
  for (const [object, fields] of Object.entries(sourceFields)) {
    catalog.set(
      object,
      new Map(fields.map((field) => [String(field.id), field])),
    );
  }
  return catalog;
}

function buildDestinationFieldCatalog(
  sourceFields: Record<FilterObject, FilterField[]>,
): DestinationFilterFieldCatalog {
  const catalog: DestinationFilterFieldCatalog = new Map();
  for (const [object, fields] of Object.entries(sourceFields)) {
    catalog.set(
      object,
      new Map(
        fields
          .filter((field) => field.key)
          .map((field) => [field.key!, field.id]),
      ),
    );
  }
  return catalog;
}

function mapOptionValue(
  value: unknown,
  options: Array<{ id: number; label: string }>,
): OptionValueResult {
  if (!options.length || value == null) {
    return { kind: "none" as const };
  }

  const optionById = new Map(options.map((option) => [String(option.id), option]));
  const parsed = parseValueList(value);
  if (!parsed) {
    return { kind: "none" as const };
  }

  const refs: string[] = [];
  for (const id of parsed.values) {
    const option = optionById.get(String(id));
    if (!option) {
      return { reason: `Opção ${id} não pôde ser remapeada` };
    }
    refs.push(slugRef(option.label, option.id));
  }

  if (refs.length === 1) {
    return { kind: "single" as const, refs, shape: parsed.shape };
  }
  return { kind: "many" as const, refs, shape: parsed.shape };
}

function parseIdList<T extends { ref: string }>(
  value: unknown,
  lookup: Map<string, T>,
): { refs: string[]; shape: "scalar" | "array" | "csv" } | { reason: string } {
  const parsed = parseValueList(value);
  if (!parsed) {
    return { reason: "Valor do filtro não tem um formato suportado para remapeamento" };
  }

  const refs: string[] = [];
  for (const id of parsed.values) {
    const item = lookup.get(String(id));
    if (!item) return { reason: `Valor ${id} não pôde ser remapeado` };
    refs.push(item.ref);
  }

  return { refs, shape: parsed.shape };
}

function parseValueList(value: unknown): ParsedValueList | null {
  if (Array.isArray(value)) {
    if (!value.every(isIdScalar)) return null;
    return { values: value, shape: "array" };
  }

  if (typeof value === "string" && value.includes(",")) {
    return {
      values: value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
      shape: "csv",
    };
  }

  if (isIdScalar(value)) {
    return { values: [value], shape: "scalar" };
  }

  return null;
}

function shapeList(values: Array<string | number>, shape: "scalar" | "array" | "csv" | undefined) {
  if (shape === "array") return values;
  if (shape === "csv") return values.join(",");
  return values[0] ?? null;
}

function isIdScalar(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}

function requireRef<T>(map: Map<string, T>, ref: string | undefined, label: string) {
  if (!ref) throw new Error(`Referência de ${label} ausente`);
  const value = map.get(ref);
  if (value == null) throw new Error(`Referência de ${label} "${ref}" não encontrada`);
  return value;
}

function sanitizeLiteral(value: unknown) {
  if (isScalar(value)) return value;
  if (Array.isArray(value) && value.every(isScalar)) return value;
  return null;
}

function isScalar(value: unknown): value is string | number | boolean | null {
  return (
    value == null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}
