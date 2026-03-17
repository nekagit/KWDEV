"use client";

/** Prompt Record Table component. */
import React from 'react';
import { TableHead, TableHeader, TableRow, TableBody, TableCell, Table } from "@/components/ui/table";
import { PromptTableRow } from "@/components/molecules/ListItems/PromptTableRow";
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("ListsAndTables/PromptRecordTable.tsx");

type PromptRecordRecord = {
  id: number;
  title: string;
  content: string;
  category?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};

interface PromptRecordTableProps {
  fullPromptRecords: PromptRecordRecord[];
  selectedPromptRecordIds: number[];
  setSelectedPromptRecordIds: React.Dispatch<React.SetStateAction<number[]>>;
  handleDelete: (id: number) => void;
  setEditOpen: (open: boolean) => void;
  setFormId: (id: number | undefined) => void;
  setFormTitle: (title: string) => void;
  setFormContent: (content: string) => void;
  onViewPrompt?: (prompt: PromptRecordRecord) => void;
  onRunPrompt?: (prompt: PromptRecordRecord) => void;
  onDuplicatePrompt?: (prompt: PromptRecordRecord) => void;
}

export function PromptRecordTable({
  fullPromptRecords,
  selectedPromptRecordIds,
  setSelectedPromptRecordIds,
  handleDelete,
  setEditOpen,
  setFormId,
  setFormTitle,
  setFormContent,
  onViewPrompt,
  onRunPrompt,
  onDuplicatePrompt,
}: PromptRecordTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {[
            { key: "select", label: "Select", className: "w-10" },
            { key: "id", label: "ID", className: "w-16" },
            { key: "title", label: "Title" },
            { key: "content", label: "Content", className: "max-w-[200px]" },
            { key: "actions", label: "Actions", className: "w-36 text-right" },
          ].map((header) => (
            <TableHead key={header.key} className={header.className}>
              {header.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {fullPromptRecords.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className={classes[0]}>
              No prompts. Create one above.
            </TableCell>
          </TableRow>
        ) : (
          fullPromptRecords.map((p: PromptRecordRecord) => (
            <PromptTableRow
              key={p.id}
              prompt={p}
              selectedPromptIds={selectedPromptRecordIds}
              setSelectedPromptIds={setSelectedPromptRecordIds}
              handleDelete={handleDelete}
              setEditOpen={setEditOpen}
              setFormId={setFormId}
              setFormTitle={setFormTitle}
              setFormContent={setFormContent}
              onViewPrompt={onViewPrompt}
              onRunPrompt={onRunPrompt}
              onDuplicatePrompt={onDuplicatePrompt}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}
