/**
 * Unit tests for api-projects: dual-mode (Tauri invoke vs fetch) for getProjectResolved,
 * listProjects, createProject, updateProject, deleteProject, getProjectExport, getFullProjectExport.
 * Mocks @/lib/tauri and global fetch to cover both branches and error handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Project } from "@/types/project";
import type { ResolvedProject } from "../api-projects";

const mockInvoke = vi.fn();
let mockIsTauri = false;
vi.mock("@/lib/tauri", () => ({
  get invoke() {
    return mockInvoke;
  },
  get isTauri() {
    return mockIsTauri;
  },
}));

const sampleProject: Project = {
  id: "proj-1",
  name: "Test Project",
  description: "A test",
  promptIds: [],
  ticketIds: [],
  ideaIds: [],
};

const sampleResolved: ResolvedProject = {
  ...sampleProject,
  prompts: [],
  tickets: [],
  ideas: [],
  designs: [],
  architectures: [],
};

describe("api-projects dual-mode", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    mockIsTauri = false;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("getProjectResolved", () => {
    it("calls invoke when isTauri is true and returns resolved project", async () => {
      mockIsTauri = true;
      mockInvoke.mockResolvedValue(sampleResolved);

      const { getProjectResolved } = await import("../api-projects");
      const result = await getProjectResolved("proj-1");

      expect(mockInvoke).toHaveBeenCalledWith("get_project_resolved", { id: "proj-1" });
      expect(result).toEqual(sampleResolved);
    });

    it("calls fetch when isTauri is false and returns parsed JSON", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(sampleResolved)),
      });
      globalThis.fetch = fetchMock;

      const { getProjectResolved } = await import("../api-projects");
      const result = await getProjectResolved("proj-1");

      expect(fetchMock).toHaveBeenCalledWith("/api/data/projects/proj-1?resolve=1", undefined);
      expect(result).toEqual(sampleResolved);
    });

    it("throws when fetch returns not ok", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Not Found",
        text: () => Promise.resolve(JSON.stringify({ error: "Project not found" })),
      });
      globalThis.fetch = fetchMock;

      const { getProjectResolved } = await import("../api-projects");

      await expect(getProjectResolved("missing")).rejects.toThrow("Project not found");
    });
  });

  describe("listProjects", () => {
    it("calls invoke when isTauri is true and returns project list", async () => {
      mockIsTauri = true;
      mockInvoke.mockResolvedValue([sampleProject]);

      const { listProjects } = await import("../api-projects");
      const result = await listProjects();

      expect(mockInvoke).toHaveBeenCalledWith("list_projects", {});
      expect(result).toEqual([sampleProject]);
    });

    it("calls fetch when isTauri is false and returns parsed JSON", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([sampleProject])),
      });
      globalThis.fetch = fetchMock;

      const { listProjects } = await import("../api-projects");
      const result = await listProjects();

      expect(fetchMock).toHaveBeenCalledWith("/api/data/projects", undefined);
      expect(result).toEqual([sampleProject]);
    });
  });

  describe("createProject", () => {
    it("calls invoke when isTauri is true and returns created project", async () => {
      mockIsTauri = true;
      mockInvoke.mockResolvedValue(sampleProject);

      const { createProject } = await import("../api-projects");
      const body = { name: "New Project" };
      const result = await createProject(body);

      expect(mockInvoke).toHaveBeenCalledWith("create_project", { project: body });
      expect(result).toEqual(sampleProject);
    });

    it("calls fetch when isTauri is false with POST and body", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(sampleProject)),
      });
      globalThis.fetch = fetchMock;

      const { createProject } = await import("../api-projects");
      const body = { name: "New Project", description: "Desc" };
      const result = await createProject(body);

      expect(fetchMock).toHaveBeenCalledWith("/api/data/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(result).toEqual(sampleProject);
    });
  });

  describe("updateProject", () => {
    it("calls invoke when isTauri is true", async () => {
      mockIsTauri = true;
      mockInvoke.mockResolvedValue({ ...sampleProject, name: "Updated" });

      const { updateProject } = await import("../api-projects");
      const result = await updateProject("proj-1", { name: "Updated" });

      expect(mockInvoke).toHaveBeenCalledWith("update_project", {
        id: "proj-1",
        project: { name: "Updated" },
      });
      expect(result.name).toBe("Updated");
    });

    it("calls fetch when isTauri is false with PUT", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ ...sampleProject, name: "Updated" })),
      });
      globalThis.fetch = fetchMock;

      const { updateProject } = await import("../api-projects");
      await updateProject("proj-1", { name: "Updated" });

      expect(fetchMock).toHaveBeenCalledWith("/api/data/projects/proj-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });
    });
  });

  describe("deleteProject", () => {
    it("calls invoke when isTauri is true", async () => {
      mockIsTauri = true;
      mockInvoke.mockResolvedValue(undefined);

      const { deleteProject } = await import("../api-projects");
      await deleteProject("proj-1");

      expect(mockInvoke).toHaveBeenCalledWith("delete_project", { id: "proj-1" });
    });

    it("calls fetch when isTauri is false with DELETE", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("") });
      globalThis.fetch = fetchMock;

      const { deleteProject } = await import("../api-projects");
      await deleteProject("proj-1");

      expect(fetchMock).toHaveBeenCalledWith("/api/data/projects/proj-1", { method: "DELETE" });
    });
  });

  describe("getProjectExport", () => {
    it("calls invoke when isTauri is true and returns string", async () => {
      mockIsTauri = true;
      mockInvoke.mockResolvedValue("# Markdown export");

      const { getProjectExport } = await import("../api-projects");
      const result = await getProjectExport("proj-1", "prompts");

      expect(mockInvoke).toHaveBeenCalledWith("get_project_export", {
        id: "proj-1",
        category: "prompts",
      });
      expect(result).toBe("# Markdown export");
    });

    it("calls fetch when isTauri is false", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify("export content")),
      });
      globalThis.fetch = fetchMock;

      const { getProjectExport } = await import("../api-projects");
      const result = await getProjectExport("proj-1", "tickets");

      expect(fetchMock).toHaveBeenCalledWith("/api/data/projects/proj-1/export/tickets", undefined);
      expect(result).toBe("export content");
    });
  });

  describe("getFullProjectExport", () => {
    it("calls invoke when isTauri is true and returns string", async () => {
      mockIsTauri = true;
      const jsonExport = '{"id":"proj-1","name":"Test"}';
      mockInvoke.mockResolvedValue(jsonExport);

      const { getFullProjectExport } = await import("../api-projects");
      const result = await getFullProjectExport("proj-1");

      expect(mockInvoke).toHaveBeenCalledWith("get_project_export", {
        id: "proj-1",
        category: "project",
      });
      expect(result).toBe(jsonExport);
    });

    it("calls fetch when isTauri is false and returns JSON.stringify(payload, null, 2)", async () => {
      const payload = { id: "proj-1", name: "Test" };
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(payload)),
      });
      globalThis.fetch = fetchMock;

      const { getFullProjectExport } = await import("../api-projects");
      const result = await getFullProjectExport("proj-1");

      expect(fetchMock).toHaveBeenCalledWith("/api/data/projects/proj-1/export", undefined);
      expect(result).toBe(JSON.stringify(payload, null, 2));
    });
  });

  describe("error propagation", () => {
    it("propagates invoke rejection for getProjectResolved", async () => {
      mockIsTauri = true;
      mockInvoke.mockRejectedValue(new Error("Backend error"));

      const { getProjectResolved } = await import("../api-projects");

      await expect(getProjectResolved("proj-1")).rejects.toThrow("Backend error");
    });

    it("throws with response text when fetch returns not ok and no JSON error", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Server Error",
        text: () => Promise.resolve("Internal Server Error"),
      });
      globalThis.fetch = fetchMock;

      const { listProjects } = await import("../api-projects");

      await expect(listProjects()).rejects.toThrow("Internal Server Error");
    });
  });
});
