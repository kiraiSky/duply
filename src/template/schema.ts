import { z } from "zod";

const ScalarValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const FieldOption = z.object({
  ref: z.string(),
  label: z.string(),
});

const CustomField = z.object({
  ref: z.string(),
  name: z.string(),
  field_type: z.string(),
  field_group_id: z.number().nullable().optional(),
  field_group_name: z.string().nullable().optional(),
  options: z.array(FieldOption).optional(),
  add_visible_flag: z.boolean().optional(),
  mandatory_flag: z.boolean().optional(),
});

const Stage = z.object({
  ref: z.string(),
  name: z.string(),
  order_nr: z.number(),
  deal_probability: z.number().optional(),
  rotten_flag: z.boolean().optional(),
  rotten_days: z.number().nullable().optional(),
});

const Pipeline = z.object({
  ref: z.string(),
  name: z.string(),
  order_nr: z.number(),
  deal_probability: z.boolean().optional(),
  stages: z.array(Stage),
});

const ActivityType = z.object({
  ref: z.string(),
  name: z.string(),
  icon_key: z.string(),
  color: z.string().nullable().optional(),
});

const LeadLabel = z.object({
  ref: z.string(),
  name: z.string(),
  color: z.string(),
});

const SavedFilterCondition = z.object({
  object: z.string(),
  operator: z.string(),
  extra_value: z.string().nullable().optional(),
  field_key: z.string(),
  field_ref: z.string().optional(),
  value_kind: z.enum([
    "literal",
    "pipeline",
    "stage",
    "field_option",
    "field_options",
    "lead_label",
    "lead_labels",
  ]),
  value: z.union([ScalarValue, z.array(ScalarValue)]).optional(),
  value_ref: z.string().optional(),
  value_refs: z.array(z.string()).optional(),
  value_shape: z.enum(["scalar", "array", "csv"]).optional(),
});

const SavedFilterGroup = z.object({
  glue: z.string(),
  conditions: z.array(SavedFilterCondition),
});

const SavedFilter = z.object({
  ref: z.string(),
  name: z.string(),
  type: z.string(),
  conditions: z.object({
    glue: z.string(),
    conditions: z.array(SavedFilterGroup),
  }),
});

export const Template = z.object({
  version: z.literal("1.0"),
  source_company_id: z.number().optional(),
  exported_at: z.string(),
  pipelines: z.array(Pipeline),
  custom_fields: z.object({
    deal: z.array(CustomField),
    person: z.array(CustomField),
    organization: z.array(CustomField),
    product: z.array(CustomField),
    lead: z.array(CustomField).default([]),
  }),
  activity_types: z.array(ActivityType),
  lead_labels: z.array(LeadLabel).default([]),
  saved_filters: z.array(SavedFilter).default([]),
});

export type Template = z.infer<typeof Template>;
export type TemplateCustomField = z.infer<typeof CustomField>;
export type TemplatePipeline = z.infer<typeof Pipeline>;
export type TemplateStage = z.infer<typeof Stage>;
export type TemplateActivityType = z.infer<typeof ActivityType>;
export type TemplateLeadLabel = z.infer<typeof LeadLabel>;
export type TemplateSavedFilter = z.infer<typeof SavedFilter>;
export type TemplateSavedFilterCondition = z.infer<typeof SavedFilterCondition>;
