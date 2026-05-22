export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  /** LLM API — supports LLM_* or legacy BUILT_IN_FORGE_* env names */
  llmApiUrl:
    process.env.LLM_API_URL?.trim() ||
    process.env.BUILT_IN_FORGE_API_URL?.trim() ||
    "",
  llmApiKey:
    process.env.LLM_API_KEY?.trim() ||
    process.env.BUILT_IN_FORGE_API_KEY?.trim() ||
    "",
  /** Storage / maps — legacy platform env names retained for compatibility */
  storageApiUrl:
    process.env.STORAGE_API_URL?.trim() ||
    process.env.BUILT_IN_FORGE_API_URL?.trim() ||
    "",
  storageApiKey:
    process.env.STORAGE_API_KEY?.trim() ||
    process.env.BUILT_IN_FORGE_API_KEY?.trim() ||
    "",
  /** @deprecated Use llmApiUrl — kept for internal platform modules */
  get forgeApiUrl() {
    return this.llmApiUrl || this.storageApiUrl;
  },
  /** @deprecated Use llmApiKey */
  get forgeApiKey() {
    return this.llmApiKey || this.storageApiKey;
  },
};
