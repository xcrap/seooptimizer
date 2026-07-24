import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const schemaPath = resolve(__dirname, "seo-response.schema.json");
const DEFAULT_MODEL = "gpt-5.4-mini";
const DEFAULT_REASONING_EFFORT = "medium";
const CODEX_TIMEOUT_MS = Number(process.env.SEO_OPTIMIZER_CODEX_TIMEOUT_MS || 120000);

let schemaPromise;

export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const systemInstructions = [
  "You are a precise SEO metadata assistant.",
  "Return one optimized title and exactly three distinct meta description variants.",
  "Keep the output useful for search snippets, human-readable, and aligned with the supplied preset.",
  "Return only valid JSON matching the requested schema."
].join(" ");

export async function getServiceStatus() {
  const provider = getProvider();
  const codexCommand = provider === "codex" ? await resolveCodexCommand() : null;

  return {
    provider,
    providerLabel: provider === "codex" ? "Local Codex" : "OpenAI API",
    model: getModel(provider),
    reasoningEffort: getReasoningEffort(),
    ready: provider === "codex" ? Boolean(codexCommand) : Boolean(getRuntimeEnv("OPENAI_API_KEY")),
    requires: provider === "codex" ? "codex login" : "OPENAI_API_KEY"
  };
}

export async function optimizeSeo(input) {
  const normalized = normalizeInput(input);
  const provider = getProvider();

  if (provider === "codex") {
    return runCodexProvider(normalized);
  }

  if (provider === "openai") {
    return runOpenAIProvider(normalized);
  }

  throw new ApiError(`Unsupported provider: ${provider}`, 500);
}

function getProvider() {
  const configured = getRuntimeEnv("SEO_OPTIMIZER_PROVIDER");
  const provider = (configured || (getRuntimeEnv("OPENAI_API_KEY") ? "openai" : "codex")).toLowerCase();

  if (provider !== "codex" && provider !== "openai") {
    throw new ApiError("SEO_OPTIMIZER_PROVIDER must be either codex or openai.", 500);
  }

  return provider;
}

function getModel(provider = getProvider()) {
  return getRuntimeEnv("SEO_OPTIMIZER_MODEL") ||
    (provider === "codex" ? getRuntimeEnv("SEO_OPTIMIZER_CODEX_MODEL") || getRuntimeEnv("CODEX_MODEL") : null) ||
    (provider === "openai" ? getRuntimeEnv("SEO_OPTIMIZER_OPENAI_MODEL") || getRuntimeEnv("OPENAI_MODEL") : null) ||
    DEFAULT_MODEL;
}

function getReasoningEffort() {
  return getRuntimeEnv("SEO_OPTIMIZER_REASONING_EFFORT") || DEFAULT_REASONING_EFFORT;
}

function normalizeInput(input) {
  const title = typeof input?.title === "string" ? input.title.trim() : "";
  const description = typeof input?.description === "string" ? input.description.trim() : "";

  if (!title && !description) {
    throw new ApiError("Add a title or description before generating.", 400);
  }

  return {
    title,
    description,
    systemPrompt: asString(input?.systemPrompt, "Optimize for search intent and click-through rate."),
    titleMin: asNumber(input?.titleMin, 50),
    titleMax: asNumber(input?.titleMax, 60),
    descMin: asNumber(input?.descMin, 140),
    descMax: asNumber(input?.descMax, 160)
  };
}

function asString(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function buildPrompt(input) {
  return `
Task: Optimize the following page metadata for SEO.

Inputs:
${input.title ? `Title: "${input.title}"` : "Title: (Not provided)"}
${input.description ? `Description: "${input.description}"` : "Description: (Not provided)"}

Constraints:
- Title length should be between ${input.titleMin} and ${input.titleMax} characters.
- Each description should be between ${input.descMin} and ${input.descMax} characters.
- Produce exactly 3 description variants.

Preset instructions:
${input.systemPrompt}

Description variant angles:
- Benefit-focused
- Curiosity-focused
- Keyword-focused
`.trim();
}

async function runOpenAIProvider(input) {
  const apiKey = getRuntimeEnv("OPENAI_API_KEY");

  if (!apiKey) {
    throw new ApiError("Missing OPENAI_API_KEY. Set it in .env or switch SEO_OPTIMIZER_PROVIDER to codex.", 500);
  }

  const model = getModel("openai");
  const reasoningEffort = getReasoningEffort();
  const schema = await getSchema();
  const client = new OpenAI({
    apiKey,
    timeout: 60000
  });

  const request = {
    model,
    instructions: systemInstructions,
    input: buildPrompt(input),
    max_output_tokens: 900,
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "seo_optimization",
        schema,
        strict: true
      }
    }
  };

  if (supportsReasoningOptions(model)) {
    request.reasoning = {
      effort: reasoningEffort
    };
  }

  const response = await client.responses.create(request);
  const output = parseModelJson(response.output_text);

  return {
    ...output,
    provider: "openai",
    providerLabel: "OpenAI API",
    model,
    reasoningEffort
  };
}

async function runCodexProvider(input) {
  const codexPrompt = [
    systemInstructions,
    "This is a pure text-generation request. Do not inspect files, modify files, or run commands.",
    buildPrompt(input)
  ].join("\n\n");

  const args = [
    "exec",
    "--ephemeral",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "--output-schema",
    schemaPath
  ];

  const configuredModel = getModel("codex");
  const reasoningEffort = getReasoningEffort();
  if (configuredModel) {
    args.push("--model", configuredModel);
  }

  if (reasoningEffort) {
    args.push("--config", `model_reasoning_effort="${reasoningEffort}"`);
  }

  args.push("-");

  const codexCommand = await resolveCodexCommand();
  if (!codexCommand) {
    throw new ApiError(
      "Codex CLI was not found. Set SEO_OPTIMIZER_CODEX_PATH to the executable path.",
      500
    );
  }

  const stdout = await runProcess(codexCommand, args, codexPrompt, CODEX_TIMEOUT_MS);
  const output = parseModelJson(stdout);

  return {
    ...output,
    provider: "codex",
    providerLabel: "Local Codex",
    model: configuredModel,
    reasoningEffort
  };
}

async function getSchema() {
  if (!schemaPromise) {
    schemaPromise = readFile(schemaPath, "utf8").then((contents) => JSON.parse(contents));
  }

  return schemaPromise;
}

function supportsReasoningOptions(model) {
  return /^(gpt-5|o[0-9]|o[134])/.test(model);
}

function parseModelJson(raw) {
  if (!raw || !raw.trim()) {
    throw new ApiError("The model returned an empty response.", 502);
  }

  let content = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    content = jsonMatch[0];
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new ApiError("The model returned invalid JSON.", 502);
  }

  if (typeof parsed.title !== "string" || !Array.isArray(parsed.description_variants)) {
    throw new ApiError("The model response did not match the expected SEO format.", 502);
  }

  const descriptionVariants = parsed.description_variants.filter((item) => typeof item === "string").slice(0, 3);

  if (descriptionVariants.length !== 3) {
    throw new ApiError("The model did not return three description variants.", 502);
  }

  return {
    title: parsed.title,
    description_variants: descriptionVariants
  };
}

function runProcess(command, args, stdin, timeoutMs) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: appRoot,
      env: {
        ...process.env,
        ...readRuntimeEnvFiles(),
        NO_COLOR: "1"
      },
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill("SIGTERM");
      rejectPromise(new ApiError("Local Codex timed out while generating SEO metadata.", 504));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);

      if (error.code === "ENOENT") {
        rejectPromise(new ApiError("Codex CLI is not installed or is not on PATH.", 500));
        return;
      }

      rejectPromise(error);
    });

    child.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);

      if (code === 0) {
        resolvePromise(stdout);
        return;
      }

      rejectPromise(new ApiError(cleanProcessError(stderr) || `Codex exited with code ${code}.`, 502));
    });

    child.stdin.end(stdin);
  });
}

async function resolveCodexCommand() {
  for (const command of getCodexCommandCandidates()) {
    if (await commandSucceeds(command, ["--version"])) {
      return command;
    }
  }

  return null;
}

function getCodexCommandCandidates() {
  const configuredPath = getRuntimeEnv("SEO_OPTIMIZER_CODEX_PATH");
  const candidates = [configuredPath, "codex", resolve(homedir(), ".local", "bin", "codex")];

  if (process.platform === "darwin") {
    candidates.push(
      "/Applications/ChatGPT.app/Contents/Resources/codex",
      resolve(homedir(), "Applications", "ChatGPT.app", "Contents", "Resources", "codex")
    );
  } else if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    candidates.push(
      resolve(process.env.LOCALAPPDATA, "Programs", "OpenAI", "Codex", "bin", "codex.exe")
    );
  }

  return [...new Set(candidates.filter(Boolean))];
}

function commandSucceeds(command, args) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { stdio: "ignore" });

    child.on("error", () => resolvePromise(false));
    child.on("close", (code) => resolvePromise(code === 0));
  });
}

function cleanProcessError(stderr) {
  return stderr
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-3)
    .join(" ");
}

function getRuntimeEnv(name) {
  const fileEnv = readRuntimeEnvFiles();
  return Object.prototype.hasOwnProperty.call(fileEnv, name) ? fileEnv[name] : process.env[name];
}

function readRuntimeEnvFiles() {
  return [".env", ".env.local"].reduce((env, filename) => {
    try {
      return {
        ...env,
        ...parseEnv(readFileSync(resolve(appRoot, filename), "utf8"))
      };
    } catch (error) {
      if (error.code === "ENOENT") return env;
      throw error;
    }
  }, {});
}

function parseEnv(contents) {
  const env = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    env[match[1]] = cleanEnvValue(match[2]);
  }

  return env;
}

function cleanEnvValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}
