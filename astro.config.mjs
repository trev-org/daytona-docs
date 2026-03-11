import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import vercel from '@astrojs/vercel/serverless'
import { mintlify } from '@mintlify/astro'
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_WEB_URL,
  base: '/docs',
  integrations: [
    mintlify({
      docsDir: './docs',
    }),
    mdx(),
    react(),
  ],
  security: {
    allowedDomains: [
      { hostname: 'daytona.io' },
      { hostname: 'www.daytona.io' },
      { hostname: 'localhost' },
      { hostname: 'api.mintlify.com' },
    ],
  },
  output: 'server',
  adapter: vercel(),
  outDir: './dist',
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['import', 'global-builtin'],
        },
      },
    },
    ssr: {
      noExternal: ['path-to-regexp', '@astrojs/react', 'zod'],
    },
  },
})
