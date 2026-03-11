import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

export const collections = {
  docs: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './.mintlify/docs' }),
    schema: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        licence: z.string().optional(),
        distribution: z.string().optional(),
        hideTitleOnPage: z.boolean().optional(),
      })
      .passthrough(),
  }),
}
