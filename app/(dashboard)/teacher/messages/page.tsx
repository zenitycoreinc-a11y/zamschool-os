"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, CheckCheck, Loader2, MessageSquare, Plus, Search, Send, X } from "lucide-react";
import { format } from "date-fns";

import { adminApiJson } from "@/lib/admin-browser-api";
import { getDisplayName } from "@/lib/profile-utils";
import { useTeacherWorkspacePreferences } from "@/lib/teacher-workspace-preferences";

const roleOptions = [
  { value: "all", label: "All chats", emptyLabel: "No conversations match this view." },
  { value: "student", label: "Students", emptyLabel: "No student conversations match this view." },
  { value: "parent", label: "Parents", emptyLabel: "No parent conversations match this view." },
  { value: "admin", label: "Admins", emptyLabel: "No admin conversations match this view." },
  { value: "teacher", label: "Staff", emptyLabel: "No staff conversations match this view." },
] as const;

type ContactRoleFilter = (typeof roleOptions)[number]["value"];

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  content?: string;
  created_at: string;
  is_read: boolean;
  isFromMe: boolean;
  other: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
};

type ConversationRow = {
  id: string;
  user: NonNullable<MessageRow["other"]>;
  messages: MessageRow[];
  lastMessage: MessageRow;
  unreadCount: number;
};

type ContactRow = {
  id: string;
  label: string;
  email?: string | null;
  role?: string | null;
};

type ConversationRoleGroup = {
  key: string;
  label: string;
  conversations: ConversationRow[];
};

type ContactRoleGroup = {
  key: string;
  label: string;
  contacts: ContactRow[];
};

export default function TeacherMessagesPage() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<MessageRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeRecipientId, setComposeRecipientId] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [quickReplyBody, setQuickReplyBody] = useState("");
  const [contactRoleFilter, setContactRoleFilter] = useState<ContactRoleFilter>(
    normalizeContactRole(searchParams.get("role"))
  );
  const { preferences } = useTeacherWorkspacePreferences();
  const composeContactId = searchParams.get("contactId") || "";
  const composeIntent = searchParams.get("compose") || "";
  const composeSubjectQuery = searchParams.get("subject") || "";
  const composeRoleQuery = normalizeContactRole(searchParams.get("role"));
  const compactCards = preferences.compactCards;

  useEffect(() => {
    setContactRoleFilter(normalizeContactRole(searchParams.get("role")));
  }, [searchParams]);

  useEffect(() => {
    void loadMessages();
  }, [contactRoleFilter]);

  const conversations = useMemo(() => {
    const conversationMap = new Map<string, ConversationRow>();

    for (const message of rows) {
      if (!message.other?.id) continue;
      const conversationId = message.other.id;
      const existing = conversationMap.get(conversationId);

      if (!existing) {
        conversationMap.set(conversationId, {
          id: conversationId,
          user: message.other,
          messages: [message],
          lastMessage: message,
          unreadCount: message.isFromMe || message.is_read ? 0 : 1,
        });
        continue;
      }

      existing.messages.push(message);
      if (new Date(message.created_at) > new Date(existing.lastMessage.created_at)) {
        existing.lastMessage = message;
      }
      if (!message.isFromMe && !message.is_read) {
        existing.unreadCount += 1;
      }
    }

    return Array.from(conversationMap.values())
      .map((conversation) => ({
        ...conversation,
        messages: conversation.messages.sort(
          (left, right) =>
            new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
        ),
      }))
      .sort(
        (left, right) =>
          new Date(right.lastMessage.created_at).getTime() -
          new Date(left.lastMessage.created_at).getTime()
      );
  }, [rows]);

  const filteredConversations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const matchesRole =
        contactRoleFilter === "all" ||
        String(conversation.user.role || "").toLowerCase() === contactRoleFilter;

      if (!matchesRole) return false;
      if (!term) return true;

      return [
        getDisplayName(conversation.user),
        conversation.user.email,
        conversation.user.role,
        conversation.lastMessage.subject,
        conversation.lastMessage.body,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [contactRoleFilter, conversations, searchTerm]);

  const filteredContacts = useMemo(() => {
    if (contactRoleFilter === "all") return contacts;
    return contacts.filter(
      (contact) => normalizeTeacherAudienceRole(contact.role) === contactRoleFilter
    );
  }, [contactRoleFilter, contacts]);

  const groupedConversations = useMemo(
    () => groupConversationsByRole(filteredConversations),
    [filteredConversations]
  );

  const groupedContacts = useMemo(
    () => groupContactsByRole(filteredContacts),
    [filteredContacts]
  );

  const activeRoleOption = roleOptions.find((option) => option.value === contactRoleFilter) || roleOptions[0];

  const selectedConversation = useMemo(() => {
    return (
      filteredConversations.find((conversation) => conversation.id === selectedConversationId) ||
      conversations.find((conversation) => conversation.id === selectedConversationId) ||
      filteredConversations[0] ||
      conversations[0] ||
      null
    );
  }, [conversations, filteredConversations, selectedConversationId]);

  useEffect(() => {
    if (selectedConversation && selectedConversation.id !== selectedConversationId) {
      setSelectedConversationId(selectedConversation.id);
    }
  }, [selectedConversation, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversation) return;
    void markConversationRead(selectedConversation);
  }, [selectedConversation?.id]);

  useEffect(() => {
    setQuickReplyBody("");
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (composeRoleQuery !== contactRoleFilter) {
      setContactRoleFilter(composeRoleQuery);
    }
  }, [composeRoleQuery, contactRoleFilter]);

  useEffect(() => {
    if (!composeContactId) return;

    if (selectedConversationId !== composeContactId) {
      setSelectedConversationId(composeContactId);
    }

    if (composeIntent === "1") {
      setComposeRecipientId(composeContactId);
      setComposeSubject(
        composeSubjectQuery ||
          selectedConversation?.lastMessage?.subject ||
          buildDefaultSubject(composeRoleQuery)
      );
      setComposeBody("");
      setComposeOpen(true);
    }
  }, [
    composeContactId,
    composeIntent,
    composeSubjectQuery,
    composeRoleQuery,
    selectedConversation?.lastMessage?.subject,
    selectedConversationId,
  ]);

  useEffect(() => {
    if (composeIntent !== "1" || composeContactId) return;
    if (composeOpen) return;

    setComposeRecipientId(filteredContacts[0]?.id || "");
    setComposeSubject(composeSubjectQuery || buildDefaultSubject(contactRoleFilter));
    setComposeBody("");
    setComposeOpen(true);
  }, [
    composeContactId,
    composeIntent,
    composeOpen,
    composeSubjectQuery,
    contactRoleFilter,
    filteredContacts,
  ]);

  useEffect(() => {
    if (!composeOpen) return;
    if (filteredContacts.some((contact) => contact.id === composeRecipientId)) return;

    setComposeRecipientId(filteredContacts[0]?.id || "");
  }, [composeOpen, composeRecipientId, filteredContacts]);

  async function loadMessages() {
    setLoading(true);
    setError("");

    try {
      const contactsPath =
        contactRoleFilter === "all"
          ? "/api/teacher/contacts?limit=200"
          : `/api/teacher/contacts?limit=200&role=${contactRoleFilter}`;
      const [messagesResponse, contactsResponse] = await Promise.all([
        adminApiJson<{ data?: MessageRow[] }>("/api/teacher/messages?limit=100"),
        adminApiJson<{ data?: ContactRow[] }>(contactsPath),
      ]);
      setRows(Array.isArray(messagesResponse.data) ? messagesResponse.data : []);
      setContacts(Array.isArray(contactsResponse.data) ? contactsResponse.data : []);
    } catch (loadError: any) {
      setRows([]);
      setContacts([]);
      setError(loadError?.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  async function markConversationRead(conversation: ConversationRow) {
    const unreadIds = conversation.messages
      .filter((message) => !message.isFromMe && !message.is_read)
      .map((message) => message.id);

    if (unreadIds.length === 0) {
      return;
    }

    setMarking(true);

    try {
      await adminApiJson("/api/teacher/messages", {
        method: "PUT",
        body: JSON.stringify({ ids: unreadIds }),
      });

      setRows((current) =>
        current.map((message) =>
          unreadIds.includes(message.id) ? { ...message, is_read: true } : message
        )
      );
    } catch (markError: any) {
      setError(markError?.message || "Failed to update read state");
    } finally {
      setMarking(false);
    }
  }

  async function sendMessage({
    recipientId,
    subject,
    body,
  }: {
    recipientId: string;
    subject: string;
    body: string;
  }) {
    setSending(true);
    setError("");

    try {
      await adminApiJson("/api/teacher/messages", {
        method: "POST",
        body: JSON.stringify({
          recipientId,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });
      await loadMessages();
      setSelectedConversationId(recipientId);
    } catch (sendError: any) {
      setError(sendError?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleSendMessage() {
    if (!composeRecipientId || !composeSubject.trim() || !composeBody.trim()) {
      setError("Select a contact, add a subject, and enter a message.");
      return;
    }

    await sendMessage({
      recipientId: composeRecipientId,
      subject: composeSubject,
      body: composeBody,
    });

    setComposeBody("");
    setComposeSubject("");
    setComposeOpen(false);
  }

  async function handleQuickReply() {
    if (!selectedConversation) return;
    if (!quickReplyBody.trim()) {
      setError("Enter a reply before sending.");
      return;
    }

    await sendMessage({
      recipientId: selectedConversation.id,
      subject: `Re: ${selectedConversation.lastMessage.subject.replace(/^Re:\s*/i, "")}`,
      body: quickReplyBody,
    });

    setQuickReplyBody("");
  }

  function openCompose() {
    setComposeRecipientId(selectedConversation?.id || filteredContacts[0]?.id || contacts[0]?.id || "");
    setComposeSubject(
      selectedConversation?.lastMessage?.subject
        ? `Re: ${selectedConversation.lastMessage.subject.replace(/^Re:\s*/i, "")}`
        : buildDefaultSubject(contactRoleFilter)
    );
    setComposeBody("");
    setComposeOpen(true);
  }

  if (loading) {
    return (
      <div className={`flex-1 ${compactCards ? "p-3" : "p-4"}`}>
        <div className="grid min-h-[50vh] place-items-center rounded-3xl border border-slate-200 bg-white shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 ${compactCards ? "space-y-5 p-3 md:p-5" : "space-y-6 p-4 md:p-6"}`}>
      <section className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${compactCards ? "p-5" : "p-6"}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Teacher inbox
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Messages</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Review conversations, focus by audience, and start support follow-ups without
              leaving the teacher workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={openCompose}
            disabled={contacts.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            New message
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {roleOptions.map((option) => {
            const active = option.value === contactRoleFilter;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setContactRoleFilter(option.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-sky-100 text-sky-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className={`grid grid-cols-1 xl:grid-cols-[340px,minmax(0,1fr)] ${compactCards ? "gap-5" : "gap-6"}`}>
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full bg-transparent outline-none"
              />
            </label>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{activeRoleOption.label}</span>
              <span>{filteredConversations.length} active chats</span>
            </div>
          </div>

          <div className={`${compactCards ? "max-h-[68vh]" : "max-h-[65vh]"} overflow-y-auto`}>
            {filteredConversations.length === 0 ? (
              <div className="grid min-h-[260px] place-items-center p-6 text-center text-sm text-slate-500">
                <div>
                  <MessageSquare className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3">{activeRoleOption.emptyLabel}</p>
                </div>
              </div>
            ) : (
              groupedConversations.map((group) => (
                <section key={group.key} className="border-b border-slate-100 last:border-b-0">
                  <div className="sticky top-0 z-[1] border-b border-slate-100 bg-slate-50/95 px-4 py-2 backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {group.label}
                    </p>
                  </div>
                  {group.conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={`w-full border-b border-slate-100 text-left transition hover:bg-slate-50 last:border-b-0 ${
                        selectedConversation?.id === conversation.id ? "bg-sky-50" : "bg-white"
                      } ${compactCards ? "px-4 py-3.5" : "px-4 py-4"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                              {getDisplayName(conversation.user).slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">
                                {getDisplayName(conversation.user)}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {getTeacherAudienceLabel(conversation.user.role)}
                                {conversation.user.email ? ` | ${conversation.user.email}` : ""}
                              </p>
                            </div>
                          </div>
                          <p className={`${compactCards ? "mt-2" : "mt-3"} truncate text-sm text-slate-700`}>
                            {conversation.lastMessage.subject}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {conversation.lastMessage.body}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-xs text-slate-400">
                            {format(new Date(conversation.lastMessage.created_at), "MMM d")}
                          </p>
                          {conversation.unreadCount > 0 ? (
                            <span className="mt-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-600 px-2 text-xs font-semibold text-white">
                              {conversation.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ))}
                </section>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          {selectedConversation ? (
            <>
              <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                      {getDisplayName(selectedConversation.user).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {getDisplayName(selectedConversation.user)}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {getTeacherAudienceLabel(selectedConversation.user.role)}
                        {selectedConversation.user.email
                          ? ` | ${selectedConversation.user.email}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {getTeacherAudienceLabel(selectedConversation.user.role)}
                    </p>
                    {marking ? <Loader2 className="mt-2 h-4 w-4 animate-spin text-slate-400" /> : null}
                  </div>
                </div>
              </div>

              <div className={`${compactCards ? "max-h-[50vh] space-y-3 p-4" : "max-h-[52vh] space-y-4 p-5"} overflow-y-auto`}>
                {selectedConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromMe ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] ${message.isFromMe ? "order-2" : "order-1"}`}>
                      <div
                        className={`rounded-2xl ${compactCards ? "px-3.5 py-2.5" : "px-4 py-3"} ${
                          message.isFromMe
                            ? "bg-sky-600 text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">
                          {message.subject}
                        </p>
                        <p className="mt-2 text-sm leading-6">{message.body}</p>
                      </div>
                      <p className="mt-1 px-1 text-xs text-slate-400">
                        {format(new Date(message.created_at), "MMM d, h:mm a")}
                        {message.isFromMe ? (
                          <span className="ml-2 align-middle">
                            {message.is_read ? (
                              <CheckCheck className="inline h-3.5 w-3.5" />
                            ) : (
                              <Check className="inline h-3.5 w-3.5" />
                            )}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Quick reply
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setComposeRecipientId(selectedConversation.id);
                        setComposeSubject(
                          `Re: ${selectedConversation.lastMessage.subject.replace(/^Re:\s*/i, "")}`
                        );
                        setComposeBody("");
                        setComposeOpen(true);
                      }}
                      className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-600"
                    >
                      Open full composer
                    </button>
                  </div>
                  <textarea
                    value={quickReplyBody}
                    onChange={(event) => setQuickReplyBody(event.target.value)}
                    placeholder="Reply directly from the thread"
                    rows={compactCards ? 3 : 4}
                    className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleQuickReply()}
                      disabled={sending}
                      className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Send reply
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="grid min-h-[420px] place-items-center p-6 text-center text-sm text-slate-500">
              <div>
                <MessageSquare className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-3">Select a conversation to start messaging.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {composeOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4">
          <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
                  Compose
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">New message</h2>
              </div>

              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Audience
                </span>
                <div className="flex flex-wrap gap-2">
                  {roleOptions.map((option) => {
                    const active = option.value === contactRoleFilter;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setContactRoleFilter(option.value)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "bg-sky-100 text-sky-700"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Select a contact
                </span>
                <select
                  value={composeRecipientId}
                  onChange={(event) => setComposeRecipientId(event.target.value)}
                  className="w-full bg-transparent outline-none"
                >
                  <option value="">Select a contact</option>
                  {groupedContacts.map((group) => (
                    <optgroup key={group.key} label={group.label}>
                      {group.contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.label}
                          {contact.email ? ` | ${contact.email}` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <label className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Subject
                </span>
                <input
                  value={composeSubject}
                  onChange={(event) => setComposeSubject(event.target.value)}
                  placeholder="Message subject"
                  className="w-full bg-transparent outline-none"
                />
              </label>

              <label className="block rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Message
                </span>
                <textarea
                  value={composeBody}
                  onChange={(event) => setComposeBody(event.target.value)}
                  placeholder="Write your message"
                  rows={6}
                  className="w-full resize-none bg-transparent outline-none"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send message
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function normalizeContactRole(value: string | null): ContactRoleFilter {
  const normalized = normalizeTeacherAudienceRole(value);

  if (normalized === "student") return "student";
  if (normalized === "parent") return "parent";
  if (normalized === "admin") return "admin";
  if (normalized === "teacher") return "teacher";
  return "all";
}

function buildDefaultSubject(role: ContactRoleFilter) {
  if (role === "student") return "Student support check-in";
  if (role === "parent") return "Parent follow-up";
  if (role === "admin") return "Teacher coordination request";
  if (role === "teacher") return "Classroom coordination";
  return "Teacher follow-up";
}

function groupConversationsByRole(conversations: ConversationRow[]): ConversationRoleGroup[] {
  return groupTeacherAudienceItems(conversations, (conversation) => conversation.user.role).map(
    (group) => ({
      ...group,
      conversations: group.items,
    })
  );
}

function groupContactsByRole(contacts: ContactRow[]): ContactRoleGroup[] {
  return groupTeacherAudienceItems(contacts, (contact) => contact.role).map((group) => ({
    ...group,
    contacts: group.items.sort((left, right) => left.label.localeCompare(right.label)),
  }));
}

function groupTeacherAudienceItems<T>(
  items: T[],
  getRole: (item: T) => string | null | undefined
): Array<{ key: string; label: string; items: T[] }> {
  const groups = [
    { key: "student", label: "Student conversations", items: [] as T[] },
    { key: "parent", label: "Parent conversations", items: [] as T[] },
    { key: "admin", label: "Admin conversations", items: [] as T[] },
    { key: "teacher", label: "Staff conversations", items: [] as T[] },
    { key: "other", label: "Other conversations", items: [] as T[] },
  ];

  for (const item of items) {
    const normalizedRole = normalizeTeacherAudienceRole(getRole(item));
    const group = groups.find((entry) => entry.key === normalizedRole) || groups[groups.length - 1];
    group.items.push(item);
  }

  return groups.filter((group) => group.items.length > 0);
}

function normalizeTeacherAudienceRole(value: string | null | undefined) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "student" || normalized === "students") return "student";
  if (normalized === "parent" || normalized === "parents") return "parent";
  if (normalized === "admin" || normalized === "admins") return "admin";
  if (normalized === "teacher" || normalized === "teachers" || normalized === "staff") {
    return "teacher";
  }

  return "other";
}

function getTeacherAudienceLabel(value: string | null | undefined) {
  const normalized = normalizeTeacherAudienceRole(value);

  if (normalized === "student") return "Student";
  if (normalized === "parent") return "Parent";
  if (normalized === "admin") return "Admin";
  if (normalized === "teacher") return "Staff";
  return "Contact";
}
