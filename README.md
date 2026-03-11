# Daytona Docs Headless Clone

This repository is a standalone Mintlify headless clone of the Daytona docs frontend.

It contains only the pieces needed to run the docs app outside the original monorepo:

- the Astro app source under `src/`
- authored docs content under `docs/`
- public assets under `public/`
- the shared redirect map under `server/util/redirects.mjs`
- local project config and package metadata

It intentionally does not include the original monorepo, reference mirror files, or legacy duplicated content from `src/content/docs`.

## Requirements

- Node.js 20+
- npm 10+ or a compatible recent npm that ships with Node 20+

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Optional: create a local env file:

```bash
cp .env.example .env
```

3. Start the dev server:

```bash
npm run dev
```

The app runs at `http://127.0.0.1:4321/docs`.

## Build

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Optional environment variables

- `PUBLIC_WEB_URL`: canonical site URL used for metadata
- `PUBLIC_REPO_URL`: base GitHub repo URL used by the "Edit this page" link
- `PUBLIC_MINTLIFY_SUBDOMAIN`: enables Mintlify search
- `PUBLIC_MINTLIFY_ASSISTANT_KEY`: enables the assistant UI
- `PUBLIC_DOCS_VERSION`: overrides the version badge in the navbar

## Notes

- The app keeps the Daytona `/docs` base path to mirror production routing.
- Search and assistant features are optional and stay disabled unless the corresponding Mintlify env vars are set.
- Authored page content lives in `docs/`. That is the source of truth for this standalone repo.
