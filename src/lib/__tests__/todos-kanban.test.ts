/**
 * Unit tests for todos-kanban: parse/serialize .cursor/7. planner/tickets.md and Kanban state.
 */
import { describe, it, expect } from "vitest";
import {
  parseTicketsMd,
  buildKanbanFromMd,
  applyInProgressState,
  markTicketsDone,
  markTicketsNotDone,
  serializeTicketsToMd,
  validateTicketsFormat,
  type ParsedTicket,
  type TodosKanbanData,
} from "../todos-kanban";

describe("parseTicketsMd", () => {
  it("returns empty array for empty or whitespace-only content", () => {
    expect(parseTicketsMd("")).toEqual([]);
    expect(parseTicketsMd("   \n\n  ")).toEqual([]);
  });

  it("parses a single checklist ticket with P0 header", () => {
    const content = [
      "### P0",
      "",
      "- [ ] #1 Set up project — Initialize repo",
    ].join("\n");
    const tickets = parseTicketsMd(content);
    expect(tickets).toHaveLength(1);
    expect(tickets[0]).toMatchObject({
      id: "ticket-1",
      number: 1,
      title: "Set up project",
      description: "Initialize repo",
      priority: "P0",
      featureName: "General",
      done: false,
      status: "Todo",
    });
  });

  it("parses done ticket (checked checkbox)", () => {
    const content = ["### P1", "", "- [x] #2 Done task — Completed"].join("\n");
    const tickets = parseTicketsMd(content);
    expect(tickets).toHaveLength(1);
    expect(tickets[0].done).toBe(true);
    expect(tickets[0].status).toBe("Done");
  });

  it("respects ### P0/P1/P2/P3 priority headers", () => {
    const content = [
      "### P0",
      "- [ ] #1 P0 task",
      "### P1",
      "- [ ] #2 P1 task",
      "### P2",
      "- [ ] #3 P2 task",
    ].join("\n");
    const tickets = parseTicketsMd(content);
    expect(tickets[0].priority).toBe("P0");
    expect(tickets[1].priority).toBe("P1");
    expect(tickets[2].priority).toBe("P2");
  });

  it("captures #### Feature: name for tickets under it", () => {
    const content = [
      "### P1",
      "",
      "#### Feature: Auth",
      "",
      "- [ ] #1 Add login — Clerk integration",
    ].join("\n");
    const tickets = parseTicketsMd(content);
    expect(tickets).toHaveLength(1);
    expect(tickets[0].featureName).toBe("Auth");
  });

  it("parses agents from — @agent1 @agent2 suffix", () => {
    const content = [
      "### P1",
      "",
      "- [ ] #1 Implement API — backend work — @backend-dev @frontend-dev",
    ].join("\n");
    const tickets = parseTicketsMd(content);
    expect(tickets).toHaveLength(1);
    expect(tickets[0].agents).toEqual(["backend-dev", "frontend-dev"]);
    expect(tickets[0].title).toBe("Implement API");
    expect(tickets[0].description).toBe("backend work");
  });
});

describe("buildKanbanFromMd", () => {
  it("places done tickets in done column", () => {
    const md = ["### P0", "- [x] #1 Done", "- [ ] #2 Todo"].join("\n");
    const data = buildKanbanFromMd(md);
    expect(data.columns.done.items).toHaveLength(1);
    expect(data.columns.done.items[0].number).toBe(1);
    expect(data.columns.backlog.items).toHaveLength(1);
    expect(data.columns.backlog.items[0].number).toBe(2);
  });

  it("places in-progress ticket ids in in_progress column", () => {
    const md = ["### P0", "- [ ] #1 A", "- [ ] #2 B"].join("\n");
    const data = buildKanbanFromMd(md, ["ticket-2"]);
    expect(data.columns.in_progress.items).toHaveLength(1);
    expect(data.columns.in_progress.items[0].id).toBe("ticket-2");
    expect(data.columns.backlog.items).toHaveLength(1);
    expect(data.columns.backlog.items[0].id).toBe("ticket-1");
  });

  it("includes tickets and parsedAt", () => {
    const md = ["### P0", "- [ ] #1 Only"].join("\n");
    const data = buildKanbanFromMd(md);
    expect(data.tickets).toHaveLength(1);
    expect(data.parsedAt).toBeDefined();
    expect(new Date(data.parsedAt).toISOString()).toBe(data.parsedAt);
  });
});

describe("applyInProgressState", () => {
  it("redistributes tickets by new inProgressIds", () => {
    const tickets: ParsedTicket[] = [
      {
        id: "ticket-1",
        number: 1,
        title: "A",
        priority: "P0",
        featureName: "General",
        done: false,
        status: "Todo",
      },
      {
        id: "ticket-2",
        number: 2,
        title: "B",
        priority: "P0",
        featureName: "General",
        done: false,
        status: "Todo",
      },
    ];
    const data: TodosKanbanData = {
      tickets,
      parsedAt: new Date().toISOString(),
      columns: {
        backlog: { name: "Backlog", items: [tickets[0], tickets[1]] },
        in_progress: { name: "In progress", items: [] },
        done: { name: "Done", items: [] },
        testing: { name: "Testing", items: [] },
      },
    };
    const updated = applyInProgressState(data, ["ticket-2"]);
    expect(updated.columns.backlog.items).toHaveLength(1);
    expect(updated.columns.backlog.items[0].id).toBe("ticket-1");
    expect(updated.columns.in_progress.items).toHaveLength(1);
    expect(updated.columns.in_progress.items[0].id).toBe("ticket-2");
  });
});

describe("markTicketsDone", () => {
  it("marks only specified ticket ids as done", () => {
    const tickets: ParsedTicket[] = [
      {
        id: "ticket-1",
        number: 1,
        title: "A",
        priority: "P0",
        featureName: "General",
        done: false,
        status: "Todo",
      },
      {
        id: "ticket-2",
        number: 2,
        title: "B",
        priority: "P0",
        featureName: "General",
        done: false,
        status: "Todo",
      },
    ];
    const result = markTicketsDone(tickets, ["ticket-2"]);
    expect(result[0].done).toBe(false);
    expect(result[1].done).toBe(true);
    expect(result[1].status).toBe("Done");
  });

  it("returns same array when ticketIds is empty", () => {
    const tickets: ParsedTicket[] = [
      {
        id: "ticket-1",
        number: 1,
        title: "A",
        priority: "P0",
        featureName: "General",
        done: false,
        status: "Todo",
      },
    ];
    expect(markTicketsDone(tickets, [])).toBe(tickets);
  });
});

describe("markTicketsNotDone", () => {
  it("marks specified ticket ids as not done", () => {
    const tickets: ParsedTicket[] = [
      {
        id: "ticket-1",
        number: 1,
        title: "A",
        priority: "P0",
        featureName: "General",
        done: true,
        status: "Done",
      },
    ];
    const result = markTicketsNotDone(tickets, ["ticket-1"]);
    expect(result[0].done).toBe(false);
    expect(result[0].status).toBe("Todo");
  });

  it("returns unchanged tickets when ticketIds is empty", () => {
    const tickets: ParsedTicket[] = [
      {
        id: "ticket-1",
        number: 1,
        title: "A",
        priority: "P0",
        featureName: "General",
        done: true,
        status: "Done",
      },
    ];
    expect(markTicketsNotDone(tickets, [])).toBe(tickets);
  });
});

describe("serializeTicketsToMd", () => {
  it("produces markdown with project name and priority sections", () => {
    const tickets: ParsedTicket[] = [
      {
        id: "ticket-1",
        number: 1,
        title: "First task",
        priority: "P0",
        featureName: "General",
        done: false,
        status: "Todo",
      },
    ];
    const md = serializeTicketsToMd(tickets, { projectName: "MyApp" });
    expect(md).toContain("# Work items (tickets) — MyApp");
    expect(md).toContain("### P0");
    expect(md).toContain("- [ ] #1 First task");
  });

  it("uses default project name when options omitted", () => {
    const md = serializeTicketsToMd([]);
    expect(md).toContain("— project");
  });
});

describe("validateTicketsFormat", () => {
  it("returns ok true for valid kanban data", () => {
    const data: TodosKanbanData = {
      tickets: [],
      parsedAt: new Date().toISOString(),
      columns: {
        backlog: { name: "Backlog", items: [] },
        in_progress: { name: "In progress", items: [] },
        done: { name: "Done", items: [] },
        testing: { name: "Testing", items: [] },
      },
    };
    const result = validateTicketsFormat(data);
    expect(result.ok).toBe(true);
    expect(result.message).toContain("parsed successfully");
  });
});
