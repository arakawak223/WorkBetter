import { z } from 'zod/v4'

export const searchSchema = z.object({
  age: z.number().int().min(18).max(70).optional(),
  occupation: z.string().max(200).optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  remoteOk: z.boolean().default(false),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
})

export type SearchFormValues = z.infer<typeof searchSchema>
