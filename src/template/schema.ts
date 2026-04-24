import { z } from "zod";

const FieldOption = z.object({
  ref: z.string(),
  label: z.string(),
});

const CustomField = z.object({
  ref: z.string(),
  name: z.string(),
  field_type: z.string(),
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
  }),
  activity_types: z.array(ActivityType),
});

export type Template = z.infer<typeof Template>;
export type TemplateCustomField = z.infer<typeof CustomField>;
export type TemplatePipeline = z.infer<typeof Pipeline>;
export type TemplateStage = z.infer<typeof Stage>;
export type TemplateActivityType = z.infer<typeof ActivityType>;
