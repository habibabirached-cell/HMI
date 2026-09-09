# Verona Spark Engine

A small TanStack/Vite React app scaffolded for development.

## Prerequisites

- Node.js 18+ (or latest LTS)
- npm (bundled with Node) or compatible package manager

## Quick start

Install dependencies:

```bash
npm install
```

Run development server (hot reload):

```bash
npm run dev
```

Open the app at http://localhost:8080/ (Vite prints the exact address).

## Build & Preview

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Linting & Formatting

Run ESLint:

```bash
npm run lint
```

Format with Prettier:

```bash
npm run format
```

## Notes

- Source code lives under `src/`.
- Routes are file-based under `src/routes/` (see `src/routes/README.md`).
- If you change TypeScript path aliases, update `tsconfig.json` and the Vite config.

## Troubleshooting

- If ports are in use, either stop the conflicting process or set `PORT` before running:

```bash
PORT=3000 npm run dev
```

- If you encounter dependency issues, try removing `node_modules` and reinstalling:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Contributing

Please keep changes small and run lint/format before opening PRs.
