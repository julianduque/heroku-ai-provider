# Repository Guidelines

## Project Structure & Module Organization

Core provider code lives in `src/`, with `src/models` covering chat and embedding adapters and `src/utils` housing shared helpers. Jest suites reside in `tests/`, including `tests/setup.ts` for shared configuration. Example agents and integration playgrounds are under `examples/`, while generated TypeDoc content is stored in `docs/`. Build artifacts land in `dist/`; regenerate them via the build pipeline instead of editing them directly. Supporting scripts (such as CommonJS fixes) are in `scripts/`.

## Build, Test, and Development Commands

Install dependencies with `pnpm install`. Use `pnpm build` to clean and emit both ESM and CJS bundles, and `pnpm docs` to refresh the API reference. Run `pnpm test` for the default Jest suite, `pnpm test:watch` during active development, and `pnpm test:coverage` before releases. `pnpm lint` checks the codebase with ESLint, while `pnpm format` applies Prettier. Try `pnpm example:tool-loop` to exercise the agent tool-call loop locally.

## Coding Style & Naming Conventions

This project targets modern TypeScript and enforces 2-space indentation via Prettier and ESLint (`eslint.config.mjs`). Prefer named exports from modules and keep filenames lowercase with hyphens or descriptive nouns (e.g., `chat.ts`). Use `camelCase` for functions and variables, `PascalCase` for types and classes, and reserve UPPER_SNAKE_CASE for environment constants. Avoid ambient `any`; annotate public APIs explicitly so generated declarations stay accurate.

## Testing Guidelines

All automated tests run through Jest with `ts-jest`. Place new specs alongside peers in `tests/**` using the `*.test.ts` suffix and mirror the source folder structure for clarity. Reuse helpers from `tests/setup.ts` when configuring shared mocks. Maintain or improve coverage when touching public features—verify locally with `pnpm test:coverage` and include regression cases for bug fixes.

## Commit & Pull Request Guidelines

Follow Conventional Commit prefixes (`feat:`, `fix:`, `build:`) as seen in the existing history to keep automated checks healthy. Before opening a PR, run `pnpm lint` and `pnpm test` so Husky hooks pass cleanly. PRs should summarize the change, reference related issues, and attach logs or screenshots for behavioral updates. Call out breaking changes or configuration impacts explicitly to aid downstream consumers.

## Security & Configuration Tips

Never commit secrets; load keys such as `INFERENCE_KEY` and `EMBEDDING_KEY` via `.env` or your shell and document placeholders in examples. When sharing reproduction steps, redact tokens and avoid echoing full request bodies that include credentials. For manual testing, prefer scoped API keys and revoke them once the investigation wraps.
