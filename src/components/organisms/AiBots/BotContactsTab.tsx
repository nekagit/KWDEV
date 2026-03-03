"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { getServerApiUrl } from "@/lib/server-api-url";
import {
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  Loader2,
  User,
  Phone,
  Mail,
  StickyNote,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export interface Contact {
  id: string;
  name: string;
  number: string;
  email?: string;
  notes?: string;
}

export function BotContactsTab({
  sessionId,
  botPath,
}: {
  sessionId: string;
  botPath: string;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<Contact | null>(null);
  const [sendMessage, setSendMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const syncInProgressRef = useRef(false);
  const prevContactCountRef = useRef(0);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        getServerApiUrl(
          `/api/ai-bots/contacts?sessionId=${encodeURIComponent(sessionId)}&botPath=${encodeURIComponent(botPath)}`
        )
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load contacts");
      setContacts(Array.isArray(data.contacts) ? data.contacts : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load contacts");
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, botPath]);

  // Initial load: sync from Telegram so anyone who messaged the bot appears as a contact
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(getServerApiUrl("/api/ai-bots/contacts/sync-telegram"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, botPath }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(data.contacts)) {
          setContacts(data.contacts);
          prevContactCountRef.current = data.contacts.length;
          setError(null);
          return;
        }
        if (res.status === 422 && data.error) setError(data.error);
        await loadContacts();
      } catch {
        if (!cancelled) await loadContacts();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, botPath, loadContacts]);

  // Auto-sync from Telegram every 12s while tab is open so new chatters appear without a button
  useEffect(() => {
    const interval = setInterval(async () => {
      if (syncInProgressRef.current) return;
      syncInProgressRef.current = true;
      try {
        const res = await fetch(getServerApiUrl("/api/ai-bots/contacts/sync-telegram"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, botPath }),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.contacts)) {
          const prevCount = prevContactCountRef.current;
          setContacts(data.contacts);
          prevContactCountRef.current = data.contacts.length;
          const added = data.contacts.length - prevCount;
          if (added > 0) toast.success(`${added} new contact(s) from Telegram`);
        } else if (res.status === 422 && data.error) {
          setError(data.error);
        }
      } finally {
        syncInProgressRef.current = false;
      }
    }, 12_000);
    return () => clearInterval(interval);
  }, [sessionId, botPath]);

  const openAdd = () => {
    setEditingContact(null);
    setFormOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditingContact(c);
    setFormOpen(true);
  };

  const openSend = (c: Contact) => {
    setSendTarget(c);
    setSendMessage("");
    setSendError(null);
    setSendDialogOpen(true);
  };

  const handleSaveContact = async (payload: Omit<Contact, "id"> & { id?: string }) => {
    const id = payload.id ?? crypto.randomUUID();
    const contact: Contact = {
      id,
      name: payload.name.trim(),
      number: payload.number.trim(),
      email: payload.email?.trim() || undefined,
      notes: payload.notes?.trim() || undefined,
    };
    const next = editingContact
      ? contacts.map((c) => (c.id === editingContact.id ? contact : c))
      : [...contacts, contact];
    setSaving(true);
    try {
      const res = await fetch(getServerApiUrl("/api/ai-bots/contacts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, botPath, contacts: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setContacts(next);
      setFormOpen(false);
      setEditingContact(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const next = contacts.filter((c) => c.id !== id);
    setSaving(true);
    try {
      const res = await fetch(getServerApiUrl("/api/ai-bots/contacts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, botPath, contacts: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setContacts(next);
      setFormOpen(false);
      setEditingContact(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!sendTarget || !sendMessage.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(getServerApiUrl("/api/ai-bots/contacts/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          botPath,
          contactId: sendTarget.id,
          contactNumber: sendTarget.number,
          message: sendMessage.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      toast.success(data.message ?? "Message sent.");
      setSendDialogOpen(false);
      setSendTarget(null);
      setSendMessage("");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorDisplay title="Contacts" message={error} />
        <Button onClick={loadContacts} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          Contacts — anyone who messages the bot on Telegram is added here automatically
        </h3>
        <div className="flex items-center gap-1.5">
          <Button size="sm" onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            Add contact
          </Button>
        </div>
      </div>

      {contacts.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground mb-4">
              No contacts yet. Add contacts so the bot can send messages to them.
            </p>
            <div className="flex justify-center">
              <Button onClick={openAdd} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add contact
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {contacts.map((c) => (
            <Card key={c.id} className="bg-card-tint-1">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium flex items-center gap-2">
                      <User className="w-4 h-4 shrink-0 text-muted-foreground" />
                      {c.name}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      {c.number}
                    </p>
                    {c.email && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        {c.email}
                      </p>
                    )}
                    {c.notes && (
                      <p className="text-xs text-muted-foreground flex items-start gap-2 mt-1">
                        <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        {c.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openSend(c)}
                      className="gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Send message
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(c)}
                      aria-label="Edit contact"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(c.id)}
                      disabled={saving}
                      aria-label="Delete contact"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ContactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editingContact}
        onSave={handleSaveContact}
        onDelete={editingContact ? () => handleDelete(editingContact.id) : undefined}
        saving={saving}
      />

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send message to {sendTarget?.name ?? "contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {sendError && (
              <ErrorDisplay title="Send failed" message={sendError} />
            )}
            {sendTarget?.number && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  Sending via Telegram to: <code className="bg-muted px-1 rounded">{sendTarget.number}</code>
                </p>
                {/^\+?\d{10,}$/.test(sendTarget.number.replace(/\s/g, "")) && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
                    Telegram needs the <strong>numeric user ID</strong>, not a phone number. Edit this contact and set the number to Nenad’s Telegram ID (e.g. from <strong>@userinfobot</strong> or from your bot’s getUpdates when they message the bot).
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="send-message">Message</Label>
              <Textarea
                id="send-message"
                placeholder="Type the message the bot will send..."
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!sendMessage.trim() || sending}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Queue for bot"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSave,
  onDelete,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onSave: (payload: Omit<Contact, "id"> & { id?: string }) => void;
  onDelete?: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setName(contact?.name ?? "");
      setNumber(contact?.number ?? "");
      setEmail(contact?.email ?? "");
      setNotes(contact?.notes ?? "");
    }
  }, [open, contact]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: contact?.id,
      name,
      number,
      email: email || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit contact" : "Add contact"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Name</Label>
            <Input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-number">Number / Telegram chat ID</Label>
            <Input
              id="contact-number"
              type="text"
              inputMode="numeric"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Telegram: numeric user ID (e.g. 123456789 from @userinfobot), not phone"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email (optional)</Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-notes">Notes (optional)</Label>
            <Input
              id="contact-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Short note"
            />
          </div>
          <DialogFooter>
            {contact && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onDelete();
                  onOpenChange(false);
                }}
                disabled={saving}
                className="mr-auto"
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim() || !number.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
