import { describe, expect, it } from "vitest";
import {
  KANBAN_TICKET_DESCRIPTION_CLASS,
  KANBAN_TICKET_FEATURE_CLASS,
  KANBAN_TICKET_TITLE_CLASS,
} from "../KanbanTicketCard";

describe("kanban ticket card classes", () => {
  it("keeps title and description fully readable without line clamping", () => {
    expect(KANBAN_TICKET_TITLE_CLASS).not.toContain("line-clamp");
    expect(KANBAN_TICKET_DESCRIPTION_CLASS).toContain("hidden");
    expect(KANBAN_TICKET_TITLE_CLASS).toContain("break-words");
  });

  it("does not truncate feature label text", () => {
    expect(KANBAN_TICKET_FEATURE_CLASS).not.toContain("truncate");
  });
});
