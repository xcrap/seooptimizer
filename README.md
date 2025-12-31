# SEO Optimizer

A modern, AI-powered tool to optimize your page titles and meta descriptions for search engines. Built with React and designed for speed and aesthetics.

![SEO Optimizer Screenshot](./public/screenshot.png) 
*(Note: You might want to add a screenshot here)*

## Features

- **AI-Powered Generation**: Uses advanced LLMs (via OpenRouter) to generate SEO-optimized title tags and meta descriptions.
- **Smart Presets**: Save and manage different prompting strategies (e.g., "Standard SEO", "Click-bait", "E-commerce").
- **Real-time Character Counting**: Visual feedback for character limits (Green for optimal length, Red for invalid).
- **Duplicate Presets**: Easily clone existing presets to create variations.
- **Model Transparency**: Shows which AI model is currently generating your content.

## Tech Stack

- **Frontend**: React, Vite
- **Styling**: Tailwind CSS v4, Lucide React (Icons)
- **AI Integration**: OpenAI SDK (connected to OpenRouter)
- **State Management**: React `useState` / `useEffect` + LocalStorage for persistence

## Getting Started

### Prerequisites

- **Runtime**: Bun (required)
- An API Key from [OpenRouter](https://openrouter.ai/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/xcrap/seooptimizer.git
   cd seooptimizer
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file in the root directory:
   ```env
   VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
   VITE_OPENROUTER_MODEL=google/gemini-2.0-flash-lite-preview-02-05:free
   ```

4. Run the development server:
   ```bash
   bun run dev
   ```

## Usage

1. **Enter Content**: Paste your current page title and description (or leave blank).
2. **Select Preset**: Choose a preset strategy from the top bar (or create your own in "Manage Presets").
3. **Generate**: Click "Generate Optimization" to receive AI-suggested variations.
4. **Copy**: Click the copy icon to grab the suggestions.

## License

MIT
