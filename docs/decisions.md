# Decisions

## Start with the workspace foundation

Initialize with `pnpm dlx create-turbo@latest` and pnpm workspaces. Keep the shared
ESLint and strict TypeScript configurations. Remove the starter Next.js apps and
generic UI package because the planned frontend is React Router and the widget
needs explicit integration boundaries.

Pin pnpm to the installed 10.30.3 version and use Node.js 24. Commit the lockfile
for reproducible dependency installation. Keep application implementations for
subsequent focused commits; do not introduce placeholder runtime packages.

## Fail lint checks on errors

Remove the starter's warning-only plugin and make undeclared environment
variables lint errors. Shared tooling should surface failures during local
checks and future CI runs.
