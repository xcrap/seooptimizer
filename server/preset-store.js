import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ApiError } from "./seo-ai.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const defaultPresetsPath = resolve(appRoot, "src", "presets.json");
const currentPresetStateKey = "current_preset_id";
const draftTitleStateKey = "draft_title";
const draftDescriptionStateKey = "draft_description";

let db;

export async function listPresets() {
  const database = await getDatabase();
  return database
    .prepare(`
      SELECT id, name, system_prompt, title_min, title_max, desc_min, desc_max
      FROM presets
      ORDER BY sort_order ASC, rowid ASC
    `)
    .all()
    .map(rowToPreset);
}

export async function replacePresets(inputPresets) {
  const presets = normalizePresets(inputPresets);
  const database = await getDatabase();
  const now = new Date().toISOString();

  const replaceAll = database.transaction((nextPresets) => {
    database.prepare("DELETE FROM presets").run();

    const insert = database.prepare(`
      INSERT INTO presets (
        id,
        name,
        system_prompt,
        title_min,
        title_max,
        desc_min,
        desc_max,
        sort_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    nextPresets.forEach((preset, index) => {
      insert.run(
        preset.id,
        preset.name,
        preset.systemPrompt,
        preset.titleMin,
        preset.titleMax,
        preset.descMin,
        preset.descMax,
        index,
        now,
        now
      );
    });
  });

  replaceAll(presets);
  return listPresets();
}

export async function getDraft() {
  return {
    title: await getStateValue(draftTitleStateKey),
    description: await getStateValue(draftDescriptionStateKey),
    currentPresetId: await getStateValue(currentPresetStateKey),
  };
}

export async function saveDraft(input) {
  const draft = normalizeDraft(input);
  await setStateValue(draftTitleStateKey, draft.title);
  await setStateValue(draftDescriptionStateKey, draft.description);

  return getDraft();
}

export async function getCurrentPreset() {
  return {
    currentPresetId: await getStateValue(currentPresetStateKey),
  };
}

export async function saveCurrentPreset(input) {
  const currentPresetId = normalizeCurrentPresetId(input);
  await setStateValue(currentPresetStateKey, currentPresetId);

  return getCurrentPreset();
}

export async function migrateBrowserStorage(input) {
  const hasPresets = Array.isArray(input?.presets);
  const hasDraft = input?.draft && typeof input.draft === "object";

  if (hasPresets) {
    const currentPresets = await listPresets();
    const incomingPresets = normalizePresets(input.presets);

    if (isDefaultPresetList(currentPresets)) {
      await replacePresets(incomingPresets);
    } else {
      const incomingIds = new Set(incomingPresets.map(preset => preset.id));
      await replacePresets([
        ...incomingPresets,
        ...currentPresets.filter(preset => !incomingIds.has(preset.id)),
      ]);
    }
  } else {
    await getDatabase();
  }

  if (hasDraft) {
    await saveDraft(input.draft);
  }

  if (typeof input?.currentPresetId === "string") {
    await saveCurrentPreset(input);
  }

  return {
    presets: await listPresets(),
    draft: await getDraft(),
    migrated: {
      presets: hasPresets,
      draft: Boolean(hasDraft),
    },
  };
}

export function getPresetDatabasePath() {
  return getDatabasePath();
}

async function getDatabase() {
  if (db) return db;

  const databasePath = getDatabasePath();
  mkdirSync(dirname(databasePath), { recursive: true });
  db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initializeDatabase(db);

  return db;
}

function getDatabasePath() {
  const configuredPath = resolve(appRoot, process.env.DB_PATH || "database");
  return extname(configuredPath) ? configuredPath : resolve(configuredPath, "seo-optimizer.sqlite");
}

function initializeDatabase(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      title_min INTEGER NOT NULL,
      title_max INTEGER NOT NULL,
      desc_min INTEGER NOT NULL,
      desc_max INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const count = database.prepare("SELECT COUNT(*) AS count FROM presets").get().count;
  if (count === 0) {
    seedDefaultPresets(database);
  }
}

function seedDefaultPresets(database) {
  const presets = getDefaultPresets();
  const now = new Date().toISOString();
  const insert = database.prepare(`
    INSERT INTO presets (
      id,
      name,
      system_prompt,
      title_min,
      title_max,
      desc_min,
      desc_max,
      sort_order,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDefaults = database.transaction((defaultPresets) => {
    defaultPresets.forEach((preset, index) => {
      insert.run(
        preset.id,
        preset.name,
        preset.systemPrompt,
        preset.titleMin,
        preset.titleMax,
        preset.descMin,
        preset.descMax,
        index,
        now,
        now
      );
    });
  });

  insertDefaults(presets);
}

function getDefaultPresets() {
  return normalizePresets(JSON.parse(readFileSync(defaultPresetsPath, "utf8")));
}

async function getStateValue(key) {
  const row = (await getDatabase())
    .prepare("SELECT value FROM app_state WHERE key = ?")
    .get(key);

  return typeof row?.value === "string" ? row.value : "";
}

async function setStateValue(key, value) {
  const now = new Date().toISOString();
  const database = await getDatabase();
  database.prepare(`
    INSERT INTO app_state (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run(key, value, now);
}

function normalizePresets(inputPresets) {
  if (!Array.isArray(inputPresets)) {
    throw new ApiError("Presets must be an array.", 400);
  }

  return inputPresets.map((preset, index) => normalizePreset(preset, index));
}

function normalizePreset(preset, index) {
  if (!preset || typeof preset !== "object") {
    throw new ApiError(`Preset at index ${index} must be an object.`, 400);
  }

  return {
    id: asNonEmptyString(preset.id, randomUUID()),
    name: asNonEmptyString(preset.name, `Preset ${index + 1}`),
    systemPrompt: asNonEmptyString(
      preset.systemPrompt,
      "Optimize for search intent and click-through rate."
    ),
    titleMin: asInteger(preset.titleMin, 50),
    titleMax: asInteger(preset.titleMax, 60),
    descMin: asInteger(preset.descMin, 140),
    descMax: asInteger(preset.descMax, 160),
  };
}

function normalizeDraft(input) {
  return {
    title: typeof input?.title === "string" ? input.title : "",
    description: typeof input?.description === "string" ? input.description : "",
  };
}

function normalizeCurrentPresetId(input) {
  return typeof input?.currentPresetId === "string" ? input.currentPresetId.trim() : "";
}

function asNonEmptyString(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function rowToPreset(row) {
  return {
    id: row.id,
    name: row.name,
    systemPrompt: row.system_prompt,
    titleMin: row.title_min,
    titleMax: row.title_max,
    descMin: row.desc_min,
    descMax: row.desc_max,
  };
}

function isDefaultPresetList(presets) {
  const defaultPresets = getDefaultPresets();

  if (presets.length !== defaultPresets.length) {
    return false;
  }

  return defaultPresets.every((defaultPreset, index) => {
    const preset = presets[index];

    return preset &&
      preset.id === defaultPreset.id &&
      preset.name === defaultPreset.name &&
      preset.systemPrompt === defaultPreset.systemPrompt &&
      preset.titleMin === defaultPreset.titleMin &&
      preset.titleMax === defaultPreset.titleMax &&
      preset.descMin === defaultPreset.descMin &&
      preset.descMax === defaultPreset.descMax;
  });
}
