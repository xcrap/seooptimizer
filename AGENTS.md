# SEO Optimizer - Agent Context

## Project Overview
SEO Optimizer is a React-based single-page application built with Vite. It uses generative AI to create optimized SEO titles and meta descriptions based on user input and selected presets.

## Technology Stack
- **Framework**: React 18+ (Vite)
- **Runtime/Package Manager**: Bun
- **Styling**: Tailwind CSS v4, Lucide React (Icons), Glassmorphism design system
- **AI/LLM**: local Vite/Bun API backed by Codex CLI by default, or OpenAI SDK with the official OpenAI API
- **State**: React Hooks (`useState`, `useEffect`), local SQLite persistence through the Vite/Bun API
- **Deployment**: Frontend static build (`bun run build`) -> `dist/`; AI generation requires the local Vite API in dev/preview or an equivalent hosted API endpoint.

## Core Features
1.  **Input/Output**: Users input a current Title/Description. The app outputs optimized alternatives.
2.  **Presets**: 
    -   Defaults are seeded from `src/presets.json`; live presets are stored in `database/seo-optimizer.sqlite`.
    -   Users can Create, Edit, Delete, and Duplicate presets.
    -   Presets contain: Name, System Prompt, Title Min/Max Length, Description Min/Max Length.
3.  **Portability**:
    -   **Export**: Saves presets to `seo-presets.json`.
    -   **Import**: Loads presets from JSON file.
    -   `seo-presets.json` and local SQLite database files are git-ignored.
4.  **UI/UX**:
    -   Dark-themed "hacker/cyberpunk" aesthetic.
    -   Red/Green visual validation for character counts.
    -   Model indicator in sidebar.

## Directory Structure
- `src/components/seo-optimizer.jsx`: Main application logic.
- `src/presets.json`: Default factory presets.
- `server/preset-store.js`: SQLite-backed preset and draft persistence.
- `src/index.css`: Tailwind configuration and global styles.

## Key Environment Variables
- `SEO_OPTIMIZER_PROVIDER`: `codex` by default, or `openai` for direct OpenAI API usage.
- `SEO_OPTIMIZER_MODEL`: Model used by either provider, currently `gpt-5.4-mini`.
- `SEO_OPTIMIZER_REASONING_EFFORT`: Reasoning effort passed to Codex/OpenAI reasoning models, currently `medium`.
- `OPENAI_API_KEY`: Required only when `SEO_OPTIMIZER_PROVIDER=openai`.
