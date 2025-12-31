# SEO Optimizer - Agent Context

## Project Overview
SEO Optimizer is a React-based single-page application built with Vite. It uses generative AI to create optimized SEO titles and meta descriptions based on user input and selected presets.

## Technology Stack
- **Framework**: React 18+ (Vite)
- **Runtime/Package Manager**: Bun
- **Styling**: Tailwind CSS v4, Lucide React (Icons), Glassmorphism design system
- **AI/LLM**: internal integration via OpenAI SDK pointing to OpenRouter API
- **State**: React Hooks (`useState`, `useEffect`), LocalStorage
- **Deployment**: Static build (`bun run build`) -> `dist/`

## Core Features
1.  **Input/Output**: Users input a current Title/Description. The app outputs optimized alternatives.
2.  **Presets**: 
    -   Saved in `src/presets.json` (defaults) and browser `localStorage` (user defaults).
    -   Users can Create, Edit, Delete, and Duplicate presets.
    -   Presets contain: Name, System Prompt, Title Min/Max Length, Description Min/Max Length.
3.  **Portability**:
    -   **Export**: Saves presets to `seo-presets.json`.
    -   **Import**: Loads presets from JSON file.
    -   `seo-presets.json` is git-ignored.
4.  **UI/UX**:
    -   Dark-themed "hacker/cyberpunk" aesthetic.
    -   Red/Green visual validation for character counts.
    -   Model indicator in sidebar.

## Directory Structure
- `src/components/seo-optimizer.jsx`: Main application logic.
- `src/presets.json`: Default factory presets.
- `src/index.css`: Tailwind configuration and global styles.

## Key Environment Variables
- `VITE_OPENROUTER_API_KEY`: Required for generations.
- `VITE_OPENROUTER_MODEL`: Specifies the model (e.g., `google/gemini-2.0-flash-lite-preview-02-05:free`).
