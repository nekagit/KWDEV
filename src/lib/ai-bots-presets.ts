/**
 * AI Bots preset management — localStorage-backed named server+path combinations.
 * Key: "kwcode-aibots-presets"
 */

export interface BotPreset {
  id: string;
  name: string;
  serverId: string;
  path: string;
  createdAt: string;
}

const PRESETS_KEY = "kwcode-aibots-presets";

export function getPresets(): BotPreset[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(PRESETS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as BotPreset[];
  } catch {
    return [];
  }
}

export function savePreset(preset: BotPreset): void {
  if (typeof window === "undefined") return;
  const presets = getPresets();
  const idx = presets.findIndex((p) => p.id === preset.id);
  if (idx >= 0) {
    presets[idx] = preset;
  } else {
    presets.push(preset);
  }
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export function deletePreset(id: string): void {
  if (typeof window === "undefined") return;
  const presets = getPresets().filter((p) => p.id !== id);
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export function getPresetById(id: string): BotPreset | undefined {
  return getPresets().find((p) => p.id === id);
}

export function createPreset(name: string, serverId: string, path: string): BotPreset {
  const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const preset: BotPreset = {
    id,
    name,
    serverId,
    path,
    createdAt: new Date().toISOString(),
  };
  savePreset(preset);
  return preset;
}
