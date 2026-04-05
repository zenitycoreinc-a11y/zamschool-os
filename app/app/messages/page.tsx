"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCheck, Loader2, MessageSquare, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { adminApiJson } from "@/lib/admin-browser-api";
import { getDisplayName } from "@/lib/profile-utils";

type MessageRow = {
  id: string;
  sender_id: string | null;
  recipient_id: string | null;
  subject: string | null;
  body: string | null;
  is_read: boolean;
  created_at: string;
  sender?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  recipient?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
};

type RecipientOption = {
  id: string;
  label: string;
  role: string;
};

export default function AppMessagesPage() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"all" | "unread" | "read">("all");
  const [composeOpen, setComposeOpen] = useState(true);
  const [form, setForm] = useState({
    recipientId: "",
    subject: "",
    body: "",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error("No active session");

        const { data: me, error: meError } = await supabase
          .from("profiles")
          .select("school_id")
          .eq("id", auth.user.id)
          .maybeSingle();
        if (meError) throw meError;
        if (!me?.school_id) throw new Error("No school linked to this account");

        setSchoolId(me.school_id);

        const [messagesBody, profilesResult] = await Promise.all([
          adminApiJson<{ data?: MessageRow[] }>("/api/admin/messages"),
          supabase
            .from("profiles")
            .select("id, first_name, last_name, email, role")
            .eq("school_id", me.school_id)
            .order("first_name", { ascending: true }),
        ]);

        setMessages(Array.isArray(messagesBody.data) ? messagesBody.data : []);

        const currentUserId = auth.user.id;
        setRecipients(
          (profilesResult.data || [])
            .filter((profile: any) => String(profile.id) !== currentUserId)
            .map((profile: any) => ({
              id: String(profile.id),
              label: getDisplayName(profile),
              role: String(profile.role || "user").toLowerCase(),
            }))
        );
      } catch (error: any) {
        toast.error(error?.message || "Failed to load messages");
        setMessages([]);
        setRecipients([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredMessages = useMemo(() => {
    return messages.filter((message) => {
      if (mode === "unread" && message.is_read) return false;
      if (mode === "read" && !message.is_read) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        String(message.subject || "").toLowerCase().includes(q) ||
        String(message.body || "").toLowerCase().includes(q) ||
        getParticipantLabel(message.sender).toLowerCase().includes(q) ||
        getParticipantLabel(message.recipient).toLowerCase().includes(q)
      );
    });
  }, [messages, mode, query]);

  const unreadCount = messages.filter((message) => !message.is_read).length;

  const sendMessage = async () => {
    if (!form.recipientId.trim() || !form.body.trim()) {
      toast.error("Recipient and message body are required");
      return;
    }

    setSending(true);
    const toastId = toast.loading("Sending message...");
    try {
      await adminApiJson("/api/admin/messages", {
        method: "POST",
        body: JSON.stringify({
          recipientId: form.recipientId,
          subject: form.subject.trim() || undefined,
          body: form.body.trim(),
        }),
      });

      setForm({ recipientId: "", subject: "", body: "" });
      setComposeOpen(false);
      try {
        await refreshMessages();
      } catch {
        toast.error("Message sent, but the inbox could not refresh");
      }
      toast.success("Message sent", { id: toastId });
    } catch (error: any) {
      toast.error(error?.message || "Failed to send message", { id: toastId });
    } finally {
      setSending(false);
    }
  };

  const refreshMessages = async () => {
    const response = await adminApiJson<{ data?: MessageRow[] }>("/api/admin/messages");
    setMessages(Array.isArray(response.data) ? response.data : []);
  };

  const markAsRead = async (message: MessageRow) => {
    if (message.is_read) return;

    setMessages((prev) => prev.map((item) => (item.id === message.id ? { ...item, is_read: true } : item)));
    try {
      await adminApiJson(`/api/admin/messages?id=${encodeURIComponent(message.id)}`, {
        method: "PUT",
      });
    } catch (error: any) {
      setMessages((prev) => prev.map((item) => (item.id === message.id ? { ...item, is_read: false } : item)));
      toast.error(error?.message || "Failed to mark message as read");
    }
  };

  const deleteMessage = async (message: MessageRow) => {
    const confirmDelete = confirm("Delete this message?");
    if (!confirmDelete) return;

    try {
      await adminApiJson(`/api/admin/messages?id=${encodeURIComponent(message.id)}`, {
        method: "DELETE",
      });
      setMessages((prev) => prev.filter((item) => item.id !== message.id));
      toast.success("Message deleted");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete message");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="text-slate-500">Send direct messages and manage the school inbox from one place.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Metric label="All" value={String(messages.length)} />
        <Metric label="Unread" value={String(unreadCount)} />
        <Metric label="Recipients" value={String(recipients.length)} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages"
              className="w-full bg-transparent outline-none text-sm text-slate-600"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              { key: "all", label: "All" },
              { key: "unread", label: "Unread" },
              { key: "read", label: "Read" },
            ] as const).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setMode(item.key)}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${mode === item.key ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setComposeOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
        >
          <Plus className="w-4 h-4" />
          {composeOpen ? "Hide composer" : "Compose message"}
        </button>
      </div>

      {composeOpen ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-600" />
            <h2 className="font-semibold text-slate-900">Compose Message</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <label>
              <span className="block text-xs font-medium text-slate-600 mb-1">Recipient</span>
              <select
                value={form.recipientId}
                onChange={(e) => setForm((prev) => ({ ...prev, recipientId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option value="">Select recipient</option>
                {recipients.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.label} {recipient.role ? `(${recipient.role})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="block text-xs font-medium text-slate-600 mb-1">Subject</span>
              <input
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Optional subject"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
              />
            </label>
          </div>

          <label>
            <span className="block text-xs font-medium text-slate-600 mb-1">Message</span>
            <textarea
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              rows={4}
              placeholder="Write a clear, direct message"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={sendMessage}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Send Message
            </button>
            <button
              onClick={() => setComposeOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MessageSquare className="w-4 h-4" />
            Inbox
          </div>
          <div className="text-xs text-slate-500">{schoolId ? "School inbox" : "Loading..."}</div>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3">Sender</th>
                  <th className="text-left px-4 py-3">Recipient</th>
                  <th className="text-left px-4 py-3">Subject</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMessages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-slate-500">
                      No messages found.
                    </td>
                  </tr>
                ) : (
                  filteredMessages.map((message) => (
                    <tr key={message.id} className={message.is_read ? "bg-white" : "bg-sky-50/40"}>
                      <td className="px-4 py-3">{getParticipantLabel(message.sender)}</td>
                      <td className="px-4 py-3">{getParticipantLabel(message.recipient)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{message.subject || "No subject"}</div>
                        <div className="text-xs text-slate-500 line-clamp-2">{message.body || ""}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            message.is_read ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {message.is_read ? "Read" : "Unread"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => markAsRead(message)}
                            disabled={message.is_read}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Mark Read
                          </button>
                          <button
                            onClick={() => deleteMessage(message)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function getParticipantLabel(
  profile:
    | {
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
        role?: string | null;
      }
    | null
    | undefined
) {
  if (!profile) return "-";
  return getDisplayName(profile) || profile.email || "-";
}
