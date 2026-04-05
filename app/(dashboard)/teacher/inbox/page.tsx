"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, CheckCheck, Loader2, MessageCircleMore, Pin, Search, Send } from "lucide-react";

import { getDisplayName } from "@/lib/profile-utils";
import { useTeacherPrefs } from "@/lib/teacher-workspace-preferences";

const inboxFilters = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "student", label: "Students" },
  { value: "parent", label: "Parents" },
  { value: "admin", label: "Admins" },
  { value: "teacher", label: "Staff" },
] as const;

type InboxFilter = (typeof inboxFilters)[number]["value"];

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
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

type InboxConversation = {
  id: string;
  label: string;
  role: string;
  preview: string;
  unreadCount: number;
  href: string;
  lastMessage: MessageRow;
};

type InboxConversationGroup = {
  key: string;
  title: string;
  conversations: InboxConversation[];
};

export default function TeacherInboxPage() {
  const { preferences } = useTeacherPrefs();
  const compactCards = preferences.compactCards;
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<InboxFilter>("all");
  const [selectedConversationId, setSelectedConversationId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInbox() {
      setLoading(true);

      try {
        const response = await fetch("/api/teacher/messages?limit=60", { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load inbox");
        }

        if (!cancelled) {
          setMessages(Array.isArray(payload.data) ? payload.data : []);
        }
      } catch {
        if (!cancelled) {
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInbox();

    return () => {
      cancelled = true;
    };
  }, []);

  const recentConversations = useMemo<InboxConversation[]>(() => {
    const map = new Map<string, InboxConversation>();

    for (const message of messages) {
      if (!message.other?.id) continue;

      const current = map.get(message.other.id);
      const nextPreview = buildPreview(message);
      const nextUnread = !message.isFromMe && !message.is_read ? 1 : 0;

      if (!current) {
        map.set(message.other.id, {
          id: message.other.id,
          label: getDisplayName(message.other),
          role: String(message.other.role || "contact").toLowerCase(),
          preview: nextPreview,
          unreadCount: nextUnread,
          href: `/teacher/messages?contactId=${message.other.id}`,
          lastMessage: message,
        });
        continue;
      }

      current.unreadCount += nextUnread;
      if (new Date(message.created_at) > new Date(current.lastMessage.created_at)) {
        current.preview = nextPreview;
        current.lastMessage = message;
      }
    }

    return Array.from(map.values()).sort(
      (left, right) =>
        new Date(right.lastMessage.created_at).getTime() -
        new Date(left.lastMessage.created_at).getTime()
    );
  }, [messages]);

  const unreadNow = useMemo(
    () => messages.filter((message) => !message.isFromMe && !message.is_read).length,
    [messages]
  );

  const filteredConversations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return recentConversations.filter((conversation) => {
      const matchesFilter =
        selectedFilter === "all"
          ? true
          : selectedFilter === "unread"
            ? conversation.unreadCount > 0
            : conversation.role === selectedFilter;

      if (!matchesFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [
        conversation.label,
        conversation.role,
        conversation.preview,
        conversation.lastMessage.subject,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [recentConversations, searchTerm, selectedFilter]);

  const pinnedConversations = useMemo(() => {
    const unreadFirst = filteredConversations.filter((conversation) => conversation.unreadCount > 0);
    const source = unreadFirst.length > 0 ? unreadFirst : filteredConversations;
    return source.slice(0, 3);
  }, [filteredConversations]);

  const allConversationRows = useMemo(() => {
    const pinnedIds = new Set(pinnedConversations.map((conversation) => conversation.id));
    return filteredConversations.filter((conversation) => !pinnedIds.has(conversation.id));
  }, [filteredConversations, pinnedConversations]);

  const groupedInboxRows = useMemo(
    () => groupInboxConversationsByRole(allConversationRows),
    [allConversationRows]
  );

  const activeConversation = useMemo(
    () =>
      filteredConversations.find((conversation) => conversation.id === selectedConversationId) ||
      pinnedConversations[0] ||
      allConversationRows[0] ||
      null,
    [allConversationRows, filteredConversations, pinnedConversations, selectedConversationId]
  );

  useEffect(() => {
    if (activeConversation && activeConversation.id !== selectedConversationId) {
      setSelectedConversationId(activeConversation.id);
    }
  }, [activeConversation, selectedConversationId]);

  return (
    <div className="space-y-6">
      <section
        className={`overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(34,158,217,0.18),_transparent_28%),linear-gradient(180deg,_#eff8ff_0%,_#ffffff_22%,_#f8fafc_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.08)] ${
          compactCards ? "p-4" : "p-5"
        }`}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr),360px]">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur">
            <div className="rounded-[1.5rem] border border-slate-100 bg-[#229ED9] px-5 py-5 text-white shadow-[0_22px_50px_rgba(34,158,217,0.28)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-sky-100/90">
                    Teacher Inbox
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-white/16">
                      <MessageCircleMore className="h-5 w-5" />
                    </span>
                    <div>
                      <h1 className="text-3xl font-semibold">Telegram-style inbox</h1>
                      <p className="mt-1 text-sm text-sky-50/90">
                        Scan conversations fast, then drop into the full chat workspace when you
                        need thread history or replies.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="rounded-2xl border border-white/20 bg-white/12 px-4 py-3 text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-sky-100/80">
                      Unread now
                    </p>
                    <p className="mt-1 text-2xl font-semibold">{unreadNow}</p>
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-white/12 px-4 py-3 text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-sky-100/80">
                      Conversations
                    </p>
                    <p className="mt-1 text-2xl font-semibold">{recentConversations.length}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/teacher/messages"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                >
                  Open chat workspace
                  <Send className="h-4 w-4" />
                </Link>
                <Link
                  href="/teacher/messages?compose=1"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Compose message
                </Link>
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-slate-100 bg-[#f7fbfe] p-4">
              <label
                htmlFor="teacher-inbox-search"
                className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
              >
                Search conversations
              </label>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  id="teacher-inbox-search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by contact, role, or message preview"
                  className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {inboxFilters.map((filter) => {
                  const active = selectedFilter === filter.value;
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setSelectedFilter(filter.value)}
                      className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "bg-sky-600 text-white shadow-sm"
                          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <InboxConversationSection
                title="Pinned"
                loading={loading}
                emptyCopy="No conversations are pinned yet. Unread or priority chats will surface here first."
                conversations={pinnedConversations}
                activeConversationId={activeConversation?.id || ""}
                onPreview={setSelectedConversationId}
              />

              <GroupedInboxConversationSection
                title="All conversations"
                loading={loading}
                emptyCopy={
                  recentConversations.length === 0
                    ? "No recent conversations yet."
                    : "No conversations match this filter."
                }
                groups={groupedInboxRows}
                activeConversationId={activeConversation?.id || ""}
                onPreview={setSelectedConversationId}
              />
            </div>
          </div>

          <aside className="rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Conversation preview
            </p>
            {loading ? (
              <div className="mt-4 flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading inbox preview...
              </div>
            ) : activeConversation ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-sky-100 text-base font-semibold text-sky-700">
                    {getInitials(activeConversation.label)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-xl font-semibold text-slate-900">
                        {activeConversation.label}
                      </h2>
                      <span className={getRoleBadgeClass(activeConversation.role)}>
                        {getRoleLabel(activeConversation.role)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Last activity {formatConversationDetail(activeConversation.lastMessage.created_at)}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      <Pin className="h-3.5 w-3.5" />
                      Active preview
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      {formatConversationTime(activeConversation.lastMessage.created_at)}
                    </span>
                  </div>
                  {activeConversation.lastMessage.subject ? (
                    <p className="mt-3 text-sm font-semibold text-slate-900">
                      {activeConversation.lastMessage.subject}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {activeConversation.preview}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Unread</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {activeConversation.unreadCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Status</p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                      {renderDeliveryState(activeConversation.lastMessage)}
                      {activeConversation.lastMessage.isFromMe ? "Sent by you" : "Waiting for reply"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={activeConversation.href}
                    className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
                  >
                    Open chat workspace
                    <Send className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/teacher/messages?compose=1&contactId=${activeConversation.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Reply from composer
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No conversation selected yet. Search or change filters to surface a thread.
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

function InboxConversationSection({
  title,
  loading,
  emptyCopy,
  conversations,
  activeConversationId,
  onPreview,
}: {
  title: string;
  loading: boolean;
  emptyCopy: string;
  conversations: InboxConversation[];
  activeConversationId: string;
  onPreview: (id: string) => void;
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">{title}</h2>
        </div>
        {title === "Pinned" ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            <Pin className="h-3.5 w-3.5" />
            Priority
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          Array.from({ length: title === "Pinned" ? 2 : 4 }).map((_, index) => (
            <div
              key={`${title}-loading-${index}`}
              className="animate-pulse rounded-[1.25rem] border border-slate-100 bg-slate-50 px-4 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 rounded-full bg-slate-200" />
                  <div className="h-3 w-3/4 rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
          ))
        ) : conversations.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            {emptyCopy}
          </div>
        ) : (
          conversations.map((conversation) => {
            return (
              <InboxConversationCard
                key={conversation.id}
                conversation={conversation}
                activeConversationId={activeConversationId}
                onPreview={onPreview}
              />
            );
          })
        )}
      </div>
    </section>
  );
}

function GroupedInboxConversationSection({
  title,
  loading,
  emptyCopy,
  groups,
  activeConversationId,
  onPreview,
}: {
  title: string;
  loading: boolean;
  emptyCopy: string;
  groups: InboxConversationGroup[];
  activeConversationId: string;
  onPreview: (id: string) => void;
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          {title}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">{title}</h2>
      </div>

      <div className="mt-4 space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`${title}-loading-${index}`}
              className="animate-pulse rounded-[1.25rem] border border-slate-100 bg-slate-50 px-4 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 rounded-full bg-slate-200" />
                  <div className="h-3 w-3/4 rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
          ))
        ) : groups.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            {emptyCopy}
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key} className="space-y-2">
              <div className="rounded-2xl bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {group.title}
                </p>
              </div>
              <div className="space-y-2">
                {group.conversations.map((conversation) => (
                  <InboxConversationCard
                    key={conversation.id}
                    conversation={conversation}
                    activeConversationId={activeConversationId}
                    onPreview={onPreview}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </section>
  );
}

function InboxConversationCard({
  conversation,
  activeConversationId,
  onPreview,
}: {
  conversation: InboxConversation;
  activeConversationId: string;
  onPreview: (id: string) => void;
}) {
  const isActive = activeConversationId === conversation.id;

  return (
    <Link
      href={conversation.href}
      onMouseEnter={() => onPreview(conversation.id)}
      onFocus={() => onPreview(conversation.id)}
      className={`group flex items-start gap-3 rounded-[1.25rem] border px-4 py-4 transition ${
        isActive
          ? "border-sky-200 bg-sky-50/80 shadow-[0_12px_30px_rgba(34,158,217,0.14)]"
          : "border-slate-100 bg-white hover:border-sky-100 hover:bg-sky-50/40"
      }`}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
        {getInitials(conversation.label)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">{conversation.label}</p>
              <span className={getRoleBadgeClass(conversation.role)}>
                {getRoleLabel(conversation.role)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {conversation.lastMessage.isFromMe ? "You replied" : "Incoming update"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-slate-400">
              {formatConversationTime(conversation.lastMessage.created_at)}
            </p>
            {conversation.unreadCount > 0 ? (
              <span className="mt-2 inline-flex min-w-6 items-center justify-center rounded-full bg-sky-600 px-2 py-1 text-[11px] font-semibold text-white">
                {conversation.unreadCount}
              </span>
            ) : (
              <span className="mt-2 inline-flex text-slate-400">
                {renderDeliveryState(conversation.lastMessage)}
              </span>
            )}
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
          {conversation.preview}
        </p>
      </div>
    </Link>
  );
}

function buildPreview(message: MessageRow) {
  const subject = message.subject?.trim();
  const body = message.body?.replace(/\s+/g, " ").trim();

  if (subject && body) {
    return `${subject}: ${body}`;
  }

  return subject || body || "No message preview available.";
}

function groupInboxConversationsByRole(
  conversations: InboxConversation[]
): InboxConversationGroup[] {
  const groups = [
    { key: "student", title: "Student conversations", conversations: [] as InboxConversation[] },
    { key: "parent", title: "Parent conversations", conversations: [] as InboxConversation[] },
    { key: "admin", title: "Admin conversations", conversations: [] as InboxConversation[] },
    { key: "teacher", title: "Staff conversations", conversations: [] as InboxConversation[] },
    { key: "other", title: "Other conversations", conversations: [] as InboxConversation[] },
  ];

  for (const conversation of conversations) {
    const normalizedRole = normalizeInboxRole(conversation.role);
    const group = groups.find((entry) => entry.key === normalizedRole) || groups[groups.length - 1];
    group.conversations.push(conversation);
  }

  return groups.filter((group) => group.conversations.length > 0);
}

function normalizeInboxRole(role: string) {
  const normalized = String(role || "")
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

function getRoleLabel(role: string) {
  switch (normalizeInboxRole(role)) {
    case "student":
      return "Student";
    case "parent":
      return "Parent";
    case "admin":
      return "Admin";
    case "teacher":
      return "Staff";
    default:
      return "Contact";
  }
}

function getRoleBadgeClass(role: string) {
  switch (normalizeInboxRole(role)) {
    case "student":
      return "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700";
    case "parent":
      return "inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700";
    case "admin":
      return "inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700";
    case "teacher":
      return "inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700";
    default:
      return "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600";
  }
}

function getInitials(label: string) {
  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function formatConversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const withinWeek = now.getTime() - date.getTime() < 6 * 24 * 60 * 60 * 1000;

  if (sameDay) {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  if (withinWeek) {
    return new Intl.DateTimeFormat("en", { weekday: "short" }).format(date);
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatConversationDetail(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function renderDeliveryState(message: MessageRow) {
  if (!message.isFromMe) {
    return <MessageCircleMore className="h-4 w-4" />;
  }

  if (message.is_read) {
    return <CheckCheck className="h-4 w-4 text-sky-600" />;
  }

  return <Check className="h-4 w-4" />;
}
