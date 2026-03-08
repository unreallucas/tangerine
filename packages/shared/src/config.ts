import { z } from "zod"

export const previewConfigSchema = z.object({
  port: z.number().optional(),
  path: z.string().default("/"),
})

export const projectConfigSchema = z.object({
  name: z.string(),
  repo: z.string(),
  defaultBranch: z.string().default("main"),
  image: z.string(),
  setup: z.string(),
  preview: previewConfigSchema.optional(),
  test: z.string().optional(),
  env: z.record(z.string()).optional(),
  model: z.string().optional(),
})

export const githubTriggerSchema = z.object({
  type: z.enum(["label", "assignee"]),
  value: z.string(),
})

export const githubIntegrationSchema = z.object({
  webhookSecret: z.string().optional(),
  pollIntervalMinutes: z.number().default(60),
  trigger: githubTriggerSchema,
})

export const integrationsSchema = z.object({
  github: githubIntegrationSchema.optional(),
})

export const tangerineConfigSchema = z.object({
  project: projectConfigSchema,
  model: z.string().default("anthropic/claude-sonnet-4-20250514"),
  integrations: integrationsSchema.optional(),
})

export type PreviewConfig = z.infer<typeof previewConfigSchema>
export type ProjectConfig = z.infer<typeof projectConfigSchema>
export type TangerineConfig = z.infer<typeof tangerineConfigSchema>
