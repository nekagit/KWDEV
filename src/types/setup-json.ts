/**
 * Structured setup data for Frontend/Backend tabs.
 * Stored as .cursor/1. project/frontend.json and backend.json; editable via cards/inputs/tables.
 */

export interface SetupKpi {
  id: string;
  label: string;
  value: string;
  unit?: string;
}

export interface SetupTechStackItem {
  id: string;
  category: string;
  name: string;
  version: string;
}

export interface FrontendEntity {
  id: string;
  name: string;
  purpose: string;
  typeLocation: string;
}

export interface FrontendRoute {
  id: string;
  page: string;
  route: string;
  component: string;
}

export interface FrontendSetupJson {
  version: string;
  title: string;
  overview: string;
  kpis: SetupKpi[];
  techStack: SetupTechStackItem[];
  entities: FrontendEntity[];
  routes: FrontendRoute[];
}

export interface BackendEntity {
  id: string;
  name: string;
  description: string;
  keyFields: string;
}

export interface BackendEndpoint {
  id: string;
  method: string;
  path: string;
  description: string;
}

export interface BackendSetupJson {
  version: string;
  title: string;
  overview: string;
  kpis: SetupKpi[];
  techStack: SetupTechStackItem[];
  entities: BackendEntity[];
  endpoints: BackendEndpoint[];
}

const DEFAULT_FRONTEND: FrontendSetupJson = {
  version: "1.0",
  title: "Frontend",
  overview: "",
  kpis: [],
  techStack: [],
  entities: [],
  routes: [],
};

const DEFAULT_BACKEND: BackendSetupJson = {
  version: "1.0",
  title: "Backend",
  overview: "",
  kpis: [],
  techStack: [],
  entities: [],
  endpoints: [],
};

export function getDefaultFrontendSetup(): FrontendSetupJson {
  return JSON.parse(JSON.stringify(DEFAULT_FRONTEND));
}

export function getDefaultBackendSetup(): BackendSetupJson {
  return JSON.parse(JSON.stringify(DEFAULT_BACKEND));
}

export function parseFrontendSetupJson(raw: string): FrontendSetupJson {
  if (!raw || !raw.trim()) return getDefaultFrontendSetup();
  try {
    const data = JSON.parse(raw) as Partial<FrontendSetupJson>;
    return {
      version: data.version ?? DEFAULT_FRONTEND.version,
      title: data.title ?? DEFAULT_FRONTEND.title,
      overview: typeof data.overview === "string" ? data.overview : DEFAULT_FRONTEND.overview,
      kpis: Array.isArray(data.kpis) ? data.kpis : DEFAULT_FRONTEND.kpis,
      techStack: Array.isArray(data.techStack) ? data.techStack : DEFAULT_FRONTEND.techStack,
      entities: Array.isArray(data.entities) ? data.entities : DEFAULT_FRONTEND.entities,
      routes: Array.isArray(data.routes) ? data.routes : DEFAULT_FRONTEND.routes,
    };
  } catch {
    return getDefaultFrontendSetup();
  }
}

export function parseBackendSetupJson(raw: string): BackendSetupJson {
  if (!raw || !raw.trim()) return getDefaultBackendSetup();
  try {
    const data = JSON.parse(raw) as Partial<BackendSetupJson>;
    return {
      version: data.version ?? DEFAULT_BACKEND.version,
      title: data.title ?? DEFAULT_BACKEND.title,
      overview: typeof data.overview === "string" ? data.overview : DEFAULT_BACKEND.overview,
      kpis: Array.isArray(data.kpis) ? data.kpis : DEFAULT_BACKEND.kpis,
      techStack: Array.isArray(data.techStack) ? data.techStack : DEFAULT_BACKEND.techStack,
      entities: Array.isArray(data.entities) ? data.entities : DEFAULT_BACKEND.entities,
      endpoints: Array.isArray(data.endpoints) ? data.endpoints : DEFAULT_BACKEND.endpoints,
    };
  } catch {
    return getDefaultBackendSetup();
  }
}

export function generateId(): string {
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
