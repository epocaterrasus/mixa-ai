// API key storage using Electron safeStorage + filesystem

import { safeStorage } from "electron";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { LLMProviderName } from "@mixa-ai/types";

const MIXA_DIR = join(homedir(), ".mixa");
const KEYS_FILE = join(MIXA_DIR, "keys.enc.json");

interface EncryptedKeys {
  [provider: string]: string; // base64-encoded encrypted data
}

function ensureDir(): void {
  if (!existsSync(MIXA_DIR)) {
    mkdirSync(MIXA_DIR, { recursive: true });
  }
}

function loadKeys(): EncryptedKeys {
  try {
    if (existsSync(KEYS_FILE)) {
      const raw = readFileSync(KEYS_FILE, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as EncryptedKeys;
      }
    }
  } catch {
    // corrupted file, start fresh
  }
  return {};
}

function saveKeys(keys: EncryptedKeys): void {
  ensureDir();
  writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), "utf-8");
}

/** Store an API key securely using OS keychain encryption */
export function storeApiKey(provider: LLMProviderName, apiKey: string): void {
  const keys = loadKeys();

  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(apiKey);
    keys[provider] = encrypted.toString("base64");
  } else {
    // Fallback: store as base64 (not truly secure, but functional for dev)
    keys[provider] = Buffer.from(apiKey, "utf-8").toString("base64");
  }

  saveKeys(keys);
}

/** Retrieve a stored API key */
export function getApiKey(provider: LLMProviderName): string | null {
  const keys = loadKeys();
  const stored = keys[provider];
  if (!stored) return null;

  try {
    const buffer = Buffer.from(stored, "base64");
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(buffer);
    }
    // Fallback: decode base64
    return buffer.toString("utf-8");
  } catch {
    return null;
  }
}

/** Delete a stored API key */
export function deleteApiKey(provider: LLMProviderName): void {
  const keys = loadKeys();
  delete keys[provider];
  saveKeys(keys);
}

/** Check if an API key exists for a given provider */
export function hasApiKey(provider: LLMProviderName): boolean {
  const keys = loadKeys();
  return provider in keys;
}

/** Get the configuration status for all providers */
export function getApiKeyStatus(): Record<LLMProviderName, boolean> {
  const keys = loadKeys();
  return {
    openai: "openai" in keys,
    anthropic: "anthropic" in keys,
    gemini: "gemini" in keys,
    ollama: "ollama" in keys,
  };
}
