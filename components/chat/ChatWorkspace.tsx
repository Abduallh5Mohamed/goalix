"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  Check,
  CheckCheck,
  Edit3,
  ImagePlus,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  Search,
  Send,
  Shield,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { hasAuthSessionMarker } from "@/lib/auth/session";
import { refreshAuthSession } from "@/lib/auth/refreshSession";
import { getApiBaseUrl, getSocketBaseUrl } from "@/lib/api/baseUrl";
import { applyCsrfHeader, ensureCsrfToken, isMutatingMethod, refreshCsrfToken } from "@/lib/api/csrf";
import { useDashboardLanguage } from "@/lib/hooks/useDashboardLanguage";
import { useAppDispatch } from "@/lib/store/hooks";
import { loginSuccess, logout } from "@/lib/store/slices/authSlice";
import type { UserRole } from "@/lib/types";

const API_BASE = getApiBaseUrl();

const copy = {
  en: {
    chats: "Chats",
    contacts: "Contacts",
    search: "Search",
    noChatsSearch: "No chats match your search.",
    noChats: "No chats yet.",
    noContacts: "No contacts.",
    selectChat: "Select a chat",
    noMessages: "No messages yet.",
    noChatSelected: "No chat selected.",
    sessionClosed: "Session closed.",
    closeSession: "Close session",
    editingMessage: "Editing message",
    message: "Message",
    send: "Send",
    save: "Save",
    you: "You",
    user: "User",
    edited: "edited",
    image: "Image",
    signInAgain: "Sign in again to use chat.",
    adminSession: "Admin session",
    admin: "Admin",
    familyChat: "Family chat",
    coach: "Coach",
    player: "Player",
    parent: "Parent",
    headCoach: "Head coach",
    assistantCoach: "Assistant coach",
    goalkeeperCoach: "Goalkeeper coach",
    fitnessCoach: "Fitness coach",
    about: "About",
    open: "Open",
    closed: "Closed",
    deleteForMe: "Delete for me",
    deleteForEveryone: "Delete for everyone",
    attachImage: "Attach image",
    editMessage: "Edit message",
    deleteMessage: "Delete message",
    coaches: "Coaches",
    admins: "Admins",
    players: "Players",
    parents: "Parents",
    groupSearch: "Search people to add...",
    imageTooLarge: "Chat image must be 8MB or smaller.",
    deleteFailed: "Unable to delete message",
    read: "Read",
    delivered: "Delivered",
    invalidImage: "Chat image must be PNG, JPG, JPEG, or WEBP.",
    openFailed: "Unable to open chat.",
    closeFailed: "Unable to close session.",
    sendFailed: "Unable to send message.",
    requestFailed: "Chat request failed.",
    messagingDisabled: "Coach messaging is not enabled for this player.",
  },
  ar: {
    chats: "المحادثات",
    contacts: "جهات الاتصال",
    search: "بحث",
    noChatsSearch: "لا توجد محادثات مطابقة للبحث.",
    noChats: "لا توجد محادثات بعد.",
    noContacts: "لا توجد جهات اتصال.",
    selectChat: "اختر محادثة",
    noMessages: "لا توجد رسائل بعد.",
    noChatSelected: "لم يتم اختيار محادثة.",
    sessionClosed: "تم إغلاق الجلسة.",
    closeSession: "إغلاق الجلسة",
    editingMessage: "تعديل الرسالة",
    message: "رسالة",
    send: "إرسال",
    save: "حفظ",
    you: "أنت",
    user: "مستخدم",
    edited: "تم التعديل",
    image: "صورة",
    signInAgain: "سجل الدخول مرة أخرى لاستخدام الشات.",
    adminSession: "جلسة الإدارة",
    admin: "الإدارة",
    familyChat: "محادثة الأسرة",
    coach: "المدرب",
    player: "اللاعب",
    parent: "ولي الأمر",
    headCoach: "المدرب الرئيسي",
    assistantCoach: "المدرب المساعد",
    goalkeeperCoach: "مدرب الحراس",
    fitnessCoach: "مدرب اللياقة",
    about: "بخصوص",
    open: "مفتوحة",
    closed: "مغلقة",
    deleteForMe: "حذف لدي فقط",
    deleteForEveryone: "حذف للجميع",
    attachImage: "إرفاق صورة",
    editMessage: "تعديل الرسالة",
    deleteMessage: "حذف الرسالة",
    coaches: "المدربون",
    admins: "الإدارة",
    players: "اللاعبون",
    parents: "أولياء الأمور",
    groupSearch: "ابحث عن الأشخاص لإضافتهم...",
    imageTooLarge: "يجب ألا تتجاوز صورة الشات 8 ميجابايت.",
    deleteFailed: "تعذر حذف الرسالة",
    read: "تمت القراءة",
    delivered: "تم التسليم",
    invalidImage: "يجب أن تكون صورة الشات بصيغة PNG أو JPG أو JPEG أو WEBP.",
    openFailed: "تعذر فتح المحادثة.",
    closeFailed: "تعذر إغلاق الجلسة.",
    sendFailed: "تعذر إرسال الرسالة.",
    requestFailed: "تعذر تنفيذ طلب المحادثة.",
    messagingDisabled: "التواصل مع المدرب غير مفعّل لهذا اللاعب.",
  },
} as const;

type ChatCopy = Record<keyof typeof copy.en, string>;

type ChatRole = "admin" | "coach" | "player" | "parent";
type ContactType = "admin" | "coach" | "player" | "parent";

type ConversationType =
  | "admin_coach"
  | "coach_player"
  | "admin_player_session"
  | "parent_coach"
  | "chat_group";

type Contact = {
  type: ContactType;
  id: string;
  user_id: string;
  player_id?: string | null;
  player_name?: string | null;
  name: string;
  subtitle?: string | null;
};

type GroupMember = {
  userId: string;
  name: string;
  role: ChatRole;
  membershipRole: "owner" | "member";
};

type Conversation = {
  id: string;
  type: ConversationType;
  status: "open" | "closed";
  admin_user_id?: string | null;
  coach_user_id?: string | null;
  player_user_id?: string | null;
  parent_user_id?: string | null;
  coach_id?: string | null;
  player_id?: string | null;
  target: {
    type: "admin" | "coach" | "player" | "parent" | "group";
    id?: string | null;
    userId?: string | null;
    name: string;
    memberCount?: number | null;
  };
  context?: {
    playerId: string;
    playerName: string;
  } | null;
  group_member_count?: number | null;
  group_members?: GroupMember[];
  canSend: boolean;
  canClose: boolean;
  last_message_at?: string | null;
  last_message_body?: string | null;
  last_attachment_url?: string | null;
  created_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  sender_name?: string | null;
  sender_role?: string | null;
  body?: string | null;
  attachment_url?: string | null;
  attachment_original_name?: string | null;
  attachment_mime_type?: string | null;
  attachment_size?: number | null;
  created_at: string;
  delivered_at?: string | null;
  edited_at?: string | null;
  read_at?: string | null;
  deleted_at?: string | null;
  deleted_by_user_id?: string | null;
  visibility?: "self" | "everyone";
};

type ContactsResponse = {
  admins?: Contact[];
  coaches?: Contact[];
  players?: Contact[];
  parents?: Contact[];
  children?: Contact[];
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string };
};

function mapApiUser(apiUser: Record<string, unknown>) {
  return {
    id: apiUser.id as string,
    email: (apiUser.email as string) ?? "",
    username: (apiUser.username as string) ?? undefined,
    fullName:
      (apiUser.full_name as string) ??
      (apiUser.fullName as string) ??
      (apiUser.username as string) ??
      (apiUser.email as string),
    role: apiUser.role as UserRole,
    avatarUrl: (apiUser.avatar_url as string) ?? "",
    phone: (apiUser.phone as string) ?? "",
    linkedPlayerId:
      (apiUser.linkedPlayerId as string | null) ??
      (apiUser.linked_player_id as string | null) ??
      null,
    createdAt: (apiUser.created_at as string) ?? new Date().toISOString(),
  };
}

async function apiJson<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (isMutatingMethod(init?.method)) {
    await ensureCsrfToken();
  }
  applyCsrfHeader(headers);

  const res = await fetch(`${API_BASE}/api/v1/chat${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (res.status === 401 && retry && hasAuthSessionMarker()) {
    const refresh = await refreshAuthSession();
    if (refresh.ok) return apiJson<T>(path, init, false);
  }

  const payload = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (
    res.status === 403 &&
    payload?.error?.code === "CSRF_TOKEN_REJECTED" &&
    retry
  ) {
    await refreshCsrfToken();
    return apiJson<T>(path, init, false);
  }
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.error?.message || "Chat request failed");
  }
  return payload.data;
}

function absoluteUploadUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path}`;
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function conversationLabel(conversation: Conversation, t: ChatCopy) {
  if (conversation.type === "chat_group") {
    return groupMembersPreview(conversation);
  }
  if (conversation.type === "admin_player_session") return t.adminSession;
  if (conversation.target.type === "admin") return t.admin;
  if (conversation.target.type === "coach") return t.coach;
  if (conversation.target.type === "player") return t.player;
  if (conversation.target.type === "parent") return t.parent;
  if (conversation.type === "parent_coach") {
    return conversation.context?.playerName
      ? `${t.familyChat} - ${conversation.context.playerName}`
      : t.familyChat;
  }
  return t.coach;
}

function groupMemberNames(conversation: Conversation) {
  return (conversation.group_members || [])
    .map((member) => member.name)
    .filter(Boolean);
}

function groupMembersPreview(conversation: Conversation) {
  const names = groupMemberNames(conversation);
  if (!names.length) {
    const memberCount =
      conversation.target.memberCount ?? conversation.group_member_count ?? null;
    return memberCount ? `${memberCount} members` : "Group chat";
  }

  return `${names.slice(0, 6).join(", ")}${names.length > 6 ? ", ..." : ""}`;
}

function formatContactSubtitle(subtitle: string | null | undefined, t: ChatCopy) {
  if (!subtitle) return "";

  const [rolePart, ...contextParts] = subtitle.split(" - ");
  const normalized = subtitle.trim().toLowerCase();
  const normalizedRole = rolePart.trim().toLowerCase();
  const labels: Record<string, string> = {
    admin: t.admin,
    coach: t.coach,
    player: t.player,
    parent: t.parent,
    head_coach: t.headCoach,
    assistant_coach: t.assistantCoach,
    goalkeeper_coach: t.goalkeeperCoach,
    fitness_coach: t.fitnessCoach,
  };

  if (contextParts.length && labels[normalizedRole]) {
    return `${labels[normalizedRole]} - ${contextParts.join(" - ")}`;
  }

  return labels[normalized] || subtitle.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function contactRoleLabel(type: ContactType, t: ChatCopy) {
  if (type === "admin") return t.admin;
  if (type === "coach") return t.coach;
  if (type === "player") return t.player;
  return t.parent;
}

function chatErrorMessage(error: unknown, t: ChatCopy, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (/cannot contact coaches|can only chat about linked children/i.test(message)) {
    return t.messagingDisabled;
  }
  if (/chat request failed/i.test(message)) return t.requestFailed;
  if (t === copy.en && message) return message;
  return message && !/^[\x00-\x7F]+$/.test(message) ? message : fallback;
}

function MessageReceipt({ message, t }: { message: Message; t: ChatCopy }) {
  if (message.read_at) {
    return (
      <span title={t.read} className="inline-flex text-cyan-300">
        <CheckCheck className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (message.delivered_at) {
    return (
      <span title={t.delivered} className="inline-flex text-slate-400">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }

  return null;
}

const allowedImageTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);
const maxChatImageBytes = 8 * 1024 * 1024;

export function ChatWorkspace({ role }: { role: ChatRole }) {
  const language = useDashboardLanguage();
  const t = copy[language];
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isInitialized } = useCurrentUser();
  const [contacts, setContacts] = useState<ContactsResponse>({});
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [connectionWarning, setConnectionWarning] = useState("");
  const [groupComposerOpen, setGroupComposerOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupMemberUserIds, setGroupMemberUserIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupDetailsOpen, setGroupDetailsOpen] = useState(false);
  const [realtimeReady, setRealtimeReady] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const selectedRef = useRef<string | null>(null);
  const readMarkingRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) || null,
    [conversations, selectedId],
  );

  const upsertConversation = useCallback((conversation: Conversation) => {
    setConversations((prev) => {
      const next = [
        conversation,
        ...prev.filter((item) => item.id !== conversation.id),
      ];
      return next.sort((a, b) => {
        const aTime = new Date(a.last_message_at || a.created_at).getTime();
        const bTime = new Date(b.last_message_at || b.created_at).getTime();
        return bTime - aTime;
      });
    });
  }, []);

  const upsertMessage = useCallback((message: Message) => {
    if (message.conversation_id !== selectedRef.current) return;
    setMessages((prev) => {
      const next = prev.some((item) => item.id === message.id)
        ? prev.map((item) => (item.id === message.id ? message : item))
        : [...prev, message];
      return next.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    });
  }, []);

  const upsertMessages = useCallback((updatedMessages: Message[]) => {
    setMessages((prev) => {
      let changed = false;
      const next = prev.map((message) => {
        const updated = updatedMessages.find((item) => item.id === message.id);
        if (!updated) return message;
        changed = true;
        return updated;
      });
      return changed ? next : prev;
    });
  }, []);

  const handleMessageDeleted = useCallback((message: Message) => {
    if (message.conversation_id !== selectedRef.current) return;
    if (message.visibility === "self") {
      setMessages((prev) => prev.filter((item) => item.id !== message.id));
      setEditingMessage((current) => (current?.id === message.id ? null : current));
      return;
    }
    setMessages((prev) =>
      prev.map((item) => (item.id === message.id ? { ...item, ...message } : item)),
    );
    setEditingMessage((current) => (current?.id === message.id ? null : current));
  }, []);

  const ensureFreshSession = useCallback(async () => {
    if (!hasAuthSessionMarker()) return true;
    const refresh = await refreshAuthSession();
    if (refresh.ok) {
      const refreshedUser = mapApiUser(refresh.user);
      dispatch(loginSuccess({ user: refreshedUser, role: refreshedUser.role }));
      return true;
    }
    if (refresh.unauthorized) {
      dispatch(logout());
      return false;
    }
    return true;
  }, [dispatch]);

  const loadConversations = useCallback(async () => {
    const canContinue = await ensureFreshSession();
    if (!canContinue) return;
    const conversationsData = await apiJson<Conversation[]>("/conversations");
    setConversations(conversationsData);
    setSelectedId((current) => current || conversationsData[0]?.id || null);
  }, [ensureFreshSession]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const canContinue = await ensureFreshSession();
      if (!canContinue) return;
      const [contactsData, conversationsData] = await Promise.all([
        apiJson<ContactsResponse>("/contacts"),
        apiJson<Conversation[]>("/conversations"),
      ]);
      setContacts(contactsData);
      setConversations(conversationsData);
      setSelectedId((current) => current || conversationsData[0]?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load chat");
    } finally {
      setLoading(false);
    }
  }, [ensureFreshSession]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      setLoading(false);
      setContacts({});
      setConversations([]);
      setMessages([]);
      setSelectedId(null);
      setConnectionWarning("");
      setRealtimeReady(false);
      return;
    }
    void load();
  }, [isAuthenticated, isInitialized, load]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;
    let cancelled = false;
    setRealtimeReady(false);

    const refreshBeforeRealtime = async () => {
      const canContinue = await ensureFreshSession();

      if (!cancelled && canContinue) setRealtimeReady(true);
    };

    void refreshBeforeRealtime();

    return () => {
      cancelled = true;
    };
  }, [ensureFreshSession, isAuthenticated, isInitialized]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !realtimeReady) return;
    const socket = io(getSocketBaseUrl(), {
      withCredentials: true,
      transports: ["polling", "websocket"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionWarning("");
    });
    socket.on("chat:message", upsertMessage);
    socket.on("chat:message_updated", upsertMessage);
    socket.on("chat:message_deleted", handleMessageDeleted);
    socket.on("chat:messages_read", upsertMessages);
    socket.on("chat:conversation", () => {
      void loadConversations();
    });
    socket.on("chat:session_closed", () => {
      void loadConversations();
    });
    socket.on("connect_error", () => {
      setConnectionWarning("Live chat connection failed");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    handleMessageDeleted,
    isAuthenticated,
    isInitialized,
    loadConversations,
    realtimeReady,
    upsertMessage,
    upsertMessages,
  ]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selectedId) return;
    socket.emit("chat:join", { conversationId: selectedId });
    return () => {
      socket.emit("chat:leave", { conversationId: selectedId });
    };
  }, [selectedId]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !selectedId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    setError("");
    apiJson<Message[]>(`/conversations/${selectedId}/messages`)
      .then(setMessages)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load messages"))
      .finally(() => setMessagesLoading(false));
  }, [isAuthenticated, isInitialized, selectedId]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !selectedId || !user?.id) return;
    if (
      !messages.some(
        (message) => message.sender_user_id !== user.id && !message.read_at,
      )
    ) {
      return;
    }
    if (readMarkingRef.current === selectedId) return;
    readMarkingRef.current = selectedId;
    apiJson<Message[]>(`/conversations/${selectedId}/read`, { method: "PATCH" })
      .then(upsertMessages)
      .catch(() => null)
      .finally(() => {
        if (readMarkingRef.current === selectedId) {
          readMarkingRef.current = null;
        }
      });
  }, [isAuthenticated, isInitialized, messages, selectedId, upsertMessages, user?.id]);

  const filteredContacts = useMemo(() => {
    const needle = normalizeSearch(query);
    const filter = (items: Contact[] = []) =>
      needle
        ? items.filter((item) =>
            normalizeSearch(`${item.name} ${item.subtitle || ""}`).includes(needle),
          )
        : items;
    return {
      admins: filter(contacts.admins),
      coaches: filter(contacts.coaches),
      players: filter(contacts.players),
      parents: filter(contacts.parents),
      children: filter(contacts.children),
    };
  }, [contacts, query]);

  const filteredConversations = useMemo(() => {
    const needle = normalizeSearch(query);
    if (!needle) return conversations;
    return conversations.filter((conversation) =>
      normalizeSearch(
        `${conversation.target.name} ${conversation.last_message_body || ""} ${conversationLabel(conversation, t)}`,
      ).includes(needle),
    );
  }, [conversations, query, t]);

  const groupCandidateContacts = useMemo(() => {
    if (role !== "coach") return [];
    const byUserId = new Map<string, Contact>();
    [
      ...(contacts.admins || []),
      ...(contacts.coaches || []),
      ...(contacts.players || []),
      ...(contacts.parents || []),
    ].forEach((contact) => {
      if (!contact.user_id || contact.user_id === user?.id) return;
      byUserId.set(contact.user_id, contact);
    });
    return [...byUserId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts.admins, contacts.coaches, contacts.parents, contacts.players, role, user?.id]);

  const filteredGroupCandidateContacts = useMemo(() => {
    const needle = normalizeSearch(groupSearch);
    if (!needle) return groupCandidateContacts;
    return groupCandidateContacts.filter((contact) =>
      normalizeSearch(
        `${contact.name} ${contact.subtitle || ""} ${contactRoleLabel(contact.type, t)}`,
      ).includes(needle),
    );
  }, [groupCandidateContacts, groupSearch, t]);

  const toggleGroupMember = useCallback((userId: string) => {
    setGroupMemberUserIds((current) =>
      current.includes(userId)
        ? current.filter((item) => item !== userId)
        : [...current, userId],
    );
  }, []);

  const resetGroupComposer = useCallback(() => {
    setGroupComposerOpen(false);
    setGroupName("");
    setGroupSearch("");
    setGroupMemberUserIds([]);
    setCreatingGroup(false);
  }, []);

  async function createChatGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role !== "coach" || creatingGroup) return;
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }
    if (!groupMemberUserIds.length) {
      setError("Choose at least one group member");
      return;
    }

    setCreatingGroup(true);
    setError("");
    try {
      const conversation = await apiJson<Conversation>("/conversations", {
        method: "POST",
        body: JSON.stringify({
          type: "chat_group",
          groupName: groupName.trim(),
          memberUserIds: groupMemberUserIds,
        }),
      });
      upsertConversation(conversation);
      setSelectedId(conversation.id);
      setGroupDetailsOpen(true);
      setEditingMessage(null);
      setBody("");
      setImage(null);
      resetGroupComposer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create group");
    } finally {
      setCreatingGroup(false);
    }
  }

  async function openConversation(contact: Contact) {
    setError("");
    try {
      let payload: Record<string, string>;
      if (role === "admin" && contact.type === "coach") {
        payload = { type: "admin_coach", coachId: contact.id };
      } else if (role === "coach" && contact.type === "admin") {
        payload = { type: "admin_coach", adminUserId: contact.user_id };
      } else if (role === "admin" && contact.type === "player") {
        payload = { type: "admin_player_session", playerId: contact.id };
      } else if (role === "coach" && contact.type === "player") {
        payload = { type: "coach_player", playerId: contact.id };
      } else if (role === "player" && contact.type === "coach") {
        payload = { type: "coach_player", coachId: contact.id };
      } else if (role === "parent" && contact.type === "coach" && contact.player_id) {
        payload = {
          type: "parent_coach",
          coachId: contact.id,
          playerId: contact.player_id,
        };
      } else if (role === "coach" && contact.type === "parent" && contact.player_id) {
        payload = {
          type: "parent_coach",
          parentUserId: contact.user_id,
          playerId: contact.player_id,
        };
      } else if (role === "coach" && contact.type === "coach") {
        const conversation = await apiJson<Conversation>("/conversations", {
          method: "POST",
          body: JSON.stringify({
            type: "chat_group",
            groupName: contact.name,
            memberUserIds: [contact.user_id],
          }),
        });
        upsertConversation(conversation);
        setSelectedId(conversation.id);
        setGroupDetailsOpen(false);
        setEditingMessage(null);
        setBody("");
        setImage(null);
        return;
      } else {
        return;
      }
      const conversation = await apiJson<Conversation>("/conversations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      upsertConversation(conversation);
      setSelectedId(conversation.id);
      setGroupDetailsOpen(false);
      setEditingMessage(null);
      setBody("");
      setImage(null);
    } catch (err) {
      setError(chatErrorMessage(err, t, t.openFailed));
    }
  }

  async function closeSession() {
    if (!selected) return;
    setError("");
    try {
      const conversation = await apiJson<Conversation>(
        `/conversations/${selected.id}/close`,
        { method: "PATCH" },
      );
      upsertConversation(conversation);
    } catch (err) {
      setError(chatErrorMessage(err, t, t.closeFailed));
    }
  }

  async function submitMessage() {
    if (!selected || !selected.canSend || sending) return;
    if (editingMessage && !body.trim()) return;
    if (!editingMessage && !body.trim() && !image) return;
    setSending(true);
    setError("");
    try {
      if (editingMessage) {
        const message = await apiJson<Message>(
          `/conversations/${selected.id}/messages/${editingMessage.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ body: body.trim() }),
          },
        );
        upsertMessage(message);
        setEditingMessage(null);
        setBody("");
        return;
      }

      const form = new FormData();
      form.append("body", body.trim());
      if (image) form.append("image", image);
      const message = await apiJson<Message>(
        `/conversations/${selected.id}/messages`,
        {
          method: "POST",
          body: form,
        },
      );
      upsertMessage(message);
      setBody("");
      setImage(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(chatErrorMessage(err, t, t.sendFailed));
    } finally {
      setSending(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage();
  }

  function startEdit(message: Message) {
    setEditingMessage(message);
    setImage(null);
    setBody(message.body || "");
    requestAnimationFrame(() => textRef.current?.focus());
  }

  function cancelEdit() {
    setEditingMessage(null);
    setBody("");
  }

  function handleImageChange(file?: File | null) {
    if (!file) {
      setImage(null);
      return;
    }
    if (!allowedImageTypes.has(file.type)) {
      setError(t.invalidImage);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > maxChatImageBytes) {
      setError(t.imageTooLarge);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setError("");
    setImage(file);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const isEnter = event.key === "Enter" || event.code === "Enter" || event.keyCode === 13;
    if (!isEnter || event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();
    void submitMessage();
  }

  async function deleteMessage(message: Message, scope: "me" | "everyone") {
    if (!selected || deletingId) return;
    setDeletingId(message.id);
    setError("");
    try {
      const deleted = await apiJson<Message>(
        `/conversations/${selected.id}/messages/${message.id}?scope=${scope}`,
        { method: "DELETE" },
      );
      handleMessageDeleted(deleted);
    } catch (err) {
      setError(chatErrorMessage(err, t, t.deleteFailed));
    } finally {
      setDeletingId(null);
    }
  }

  const selectedIsGroup = selected?.type === "chat_group";
  const selectedGroupMembers = selectedIsGroup
    ? selected.group_members || []
    : [];
  const canSubmitMessage = Boolean(
    selected?.canSend &&
    !sending &&
    (editingMessage ? body.trim() : body.trim() || image),
  );

  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="goalix-chat-empty-auth">
        {t.signInAgain}
      </div>
    );
  }

  return (
    <div className="goalix-chat-shell" dir={language === "ar" ? "rtl" : "ltr"}>
      <aside className="goalix-chat-panel goalix-chat-conversations">
        <div className="goalix-chat-panel-head">
          <MessageSquare className="goalix-chat-head-icon" />
          <h1>{t.chats}</h1>
          {loading && <Loader2 className="goalix-chat-loading" />}
        </div>
        <div className="goalix-chat-scroll">
          {filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => {
                setSelectedId(conversation.id);
                setGroupDetailsOpen(false);
              }}
              className={cn(
                "goalix-chat-list-card",
                selectedId === conversation.id && "is-active",
                conversation.status === "closed" && "is-locked",
              )}
            >
              <Avatar className="goalix-chat-avatar">
                <AvatarFallback>
                  {getInitials(conversation.target.name)}
                </AvatarFallback>
              </Avatar>
              <span className="goalix-chat-list-copy">
                <span className="goalix-chat-list-title">
                  {conversation.target.name}
                </span>
                <span className="goalix-chat-list-subtitle">
                  {conversation.last_message_body ||
                    (conversation.last_attachment_url ? t.image : conversationLabel(conversation, t))}
                </span>
              </span>
              {conversation.status === "closed" && <Lock className="goalix-chat-lock" />}
            </button>
          ))}
          {!loading && filteredConversations.length === 0 && (
            <div className="goalix-chat-empty-state">
              {query.trim() ? t.noChatsSearch : t.noChats}
            </div>
          )}
        </div>
      </aside>

      <main className="goalix-chat-panel goalix-chat-thread">
        <div className="goalix-chat-thread-head">
          {selected ? (
            <>
              <button
                type="button"
                className={cn(
                  "goalix-chat-thread-profile",
                  selectedIsGroup && "is-clickable",
                )}
                onClick={() => {
                  if (selectedIsGroup) {
                    setGroupDetailsOpen((current) => !current);
                  }
                }}
                disabled={!selectedIsGroup}
                aria-expanded={selectedIsGroup ? groupDetailsOpen : undefined}
              >
                <Avatar className="goalix-chat-avatar is-thread">
                  <AvatarFallback>
                    {getInitials(selected.target.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="goalix-chat-thread-title">
                  <h2>{selected.target.name}</h2>
                  <div>
                    <Badge
                      variant={selected.status === "open" ? "success" : "secondary"}
                  className="goalix-chat-status-badge"
                >
                      {selected.status === "open" ? t.open : t.closed}
                    </Badge>
                    <span>{conversationLabel(selected, t)}</span>
                    {selected.context?.playerName && (
                      <span className="goalix-chat-context-pill">
                        {t.about} {selected.context.playerName}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              {selectedIsGroup && (
                <button
                  type="button"
                  className="goalix-chat-members-toggle"
                  onClick={() => setGroupDetailsOpen((current) => !current)}
                  aria-label="Show group members"
                  aria-expanded={groupDetailsOpen}
                  title="Show group members"
                >
                  <Users className="h-4 w-4" />
                </button>
              )}
              {selected.canClose && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="goalix-chat-close-session"
                  onClick={closeSession}
                >
                  {t.closeSession}
                </Button>
              )}
            </>
          ) : (
            <span className="goalix-chat-muted">{t.selectChat}</span>
          )}
        </div>

        {selectedIsGroup && groupDetailsOpen && (
          <div className="goalix-chat-group-details">
            <div className="goalix-chat-group-details-head">
              <div>
                <strong>Group members</strong>
                <span>{selectedGroupMembers.length} members</span>
              </div>
              <button
                type="button"
                onClick={() => setGroupDetailsOpen(false)}
                title="Close members"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="goalix-chat-group-details-list">
              {selectedGroupMembers.map((member) => (
                <div
                  key={member.userId}
                  className="goalix-chat-group-details-member"
                >
                  <Avatar className="goalix-chat-avatar is-contact">
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <span className="goalix-chat-list-copy">
                    <span className="goalix-chat-list-title">
                      {member.name}
                    </span>
                    <span className="goalix-chat-list-subtitle">
                      {formatContactSubtitle(member.role, t)}
                      {member.membershipRole === "owner" ? " | Owner" : ""}
                    </span>
                  </span>
                </div>
              ))}
              {selectedGroupMembers.length === 0 && (
                <div className="goalix-chat-empty-state is-compact">
                  No members found.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="goalix-chat-messages">
          {messagesLoading && (
            <div className="goalix-chat-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {!messagesLoading && selected && messages.length === 0 && (
            <div className="goalix-chat-center">
              {t.noMessages}
            </div>
          )}
          {!messagesLoading && !selected && (
            <div className="goalix-chat-center">
              {t.noChatSelected}
            </div>
          )}
          <div className="goalix-chat-message-stack">
            {messages.map((message) => {
              const mine = message.sender_user_id === user?.id;
              const deletedForEveryone = Boolean(message.deleted_at);
              return (
                <div
                  key={message.id}
                  className={cn("goalix-chat-message-row", mine ? "is-own" : "is-other")}
                >
                  <div
                    className="goalix-chat-bubble"
                  >
                    <div className="goalix-chat-message-meta">
                      <span>{mine ? t.you : message.sender_name || t.user}</span>
                      <span>{new Date(message.created_at).toLocaleTimeString(language === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                      {message.edited_at && !deletedForEveryone && <span>{t.edited}</span>}
                      {mine && (
                        <span className="goalix-chat-message-actions">
                          <MessageReceipt message={message} t={t} />
                          {selected?.canSend && message.body && (
                            <button
                              type="button"
                              onClick={() => startEdit(message)}
                              className="goalix-chat-icon-button"
                              title={t.editMessage}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </span>
                      )}
                      {selected?.canSend && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              disabled={deletingId === message.id}
                              className="goalix-chat-icon-button is-danger"
                              title={t.deleteMessage}
                            >
                              {deletingId === message.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align={mine ? "end" : "start"}
                            className="border-[#2b4661] bg-[#07172a] text-slate-100"
                          >
                            <DropdownMenuItem
                              className="cursor-pointer focus:bg-white/10"
                              onClick={() => deleteMessage(message, "me")}
                            >
                              {t.deleteForMe}
                            </DropdownMenuItem>
                            {mine && !deletedForEveryone && (
                              <>
                                <DropdownMenuSeparator className="bg-[#2b4661]" />
                                <DropdownMenuItem
                                  className="cursor-pointer text-red-200 focus:bg-red-500/15 focus:text-red-100"
                                  onClick={() => deleteMessage(message, "everyone")}
                                >
                                  {t.deleteForEveryone}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {message.body ? (
                      <p className="goalix-chat-message-text">
                        {message.body}
                      </p>
                    ) : null}
                    {!deletedForEveryone && message.attachment_url && (
                      <a
                        href={absoluteUploadUrl(message.attachment_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="goalix-chat-attachment"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={absoluteUploadUrl(message.attachment_url)}
                          alt={message.attachment_original_name || t.image}
                          crossOrigin="use-credentials"
                          loading="lazy"
                          decoding="async"
                          className="max-h-[340px] w-full object-contain"
                        />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={sendMessage} className="goalix-chat-composer">
          {error && (
            <div className="goalix-chat-alert is-error">
              {error}
            </div>
          )}
          {connectionWarning && (
            <div className="goalix-chat-alert is-warning">
              {connectionWarning}
            </div>
          )}
          {selected?.status === "closed" && (
            <div className="goalix-chat-alert">
              <Lock className="h-4 w-4" />
              {t.sessionClosed}
            </div>
          )}
          {editingMessage && (
            <div className="goalix-chat-alert is-editing">
              <Edit3 className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate">{t.editingMessage}</span>
              <button type="button" onClick={cancelEdit}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {image && (
            <div className="goalix-chat-alert is-image">
              <ImagePlus className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate">{image.name}</span>
              <button type="button" onClick={() => setImage(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="goalix-chat-composer-row">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(event) => handleImageChange(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!selected?.canSend || sending || Boolean(editingMessage)}
              className="goalix-chat-attach-button"
              onClick={() => fileRef.current?.click()}
              title={t.attachImage}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Textarea
              ref={textRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={2}
              maxLength={4000}
              disabled={!selected?.canSend || sending}
              placeholder={selected?.canSend ? t.message : ""}
              className="goalix-chat-input"
            />
            <Button
              type="submit"
              disabled={!canSubmitMessage}
              className="goalix-chat-send-button"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingMessage ? (
                <Check className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {editingMessage ? t.save : t.send}
            </Button>
          </div>
        </form>
      </main>

      <aside className="goalix-chat-panel goalix-chat-contacts">
        <div className="goalix-chat-panel-head">
          {role === "admin" ? <Shield className="goalix-chat-head-icon" /> : role === "coach" ? <Users className="goalix-chat-head-icon" /> : <UserRound className="goalix-chat-head-icon" />}
          <h2>{t.contacts}</h2>
        </div>
        <div className="goalix-chat-search-wrap">
          <div className="goalix-chat-search">
            <Search />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="goalix-chat-search-input"
              placeholder={t.search}
            />
          </div>
        </div>
        {role === "coach" && (
          <div className="goalix-chat-group-maker">
            {!groupComposerOpen ? (
              <Button
                type="button"
                size="sm"
                className="goalix-chat-new-group-button"
                onClick={() => setGroupComposerOpen(true)}
              >
                <Plus className="h-4 w-4" />
                New group
              </Button>
            ) : (
              <form onSubmit={createChatGroup} className="goalix-chat-group-form">
                <div className="goalix-chat-group-form-head">
                  <div>
                    <strong>New chat group</strong>
                    <span>{groupMemberUserIds.length} selected</span>
                  </div>
                  <button
                    type="button"
                    onClick={resetGroupComposer}
                    title="Close group creator"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  maxLength={120}
                  placeholder="Group name"
                  className="goalix-chat-group-input"
                />
                <div className="goalix-chat-search is-group">
                  <Search />
                  <Input
                    value={groupSearch}
                    onChange={(event) => setGroupSearch(event.target.value)}
                    className="goalix-chat-search-input"
                    placeholder={t.groupSearch}
                  />
                </div>
                <div className="goalix-chat-group-member-list">
                  {filteredGroupCandidateContacts.map((contact) => {
                    const selectedMember = groupMemberUserIds.includes(
                      contact.user_id,
                    );
                    return (
                      <label
                        key={`${contact.type}-${contact.user_id}`}
                        className={cn(
                          "goalix-chat-group-member",
                          selectedMember && "is-selected",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMember}
                          onChange={() => toggleGroupMember(contact.user_id)}
                        />
                        <Avatar className="goalix-chat-avatar is-contact">
                          <AvatarFallback>
                            {getInitials(contact.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="goalix-chat-list-copy">
                          <span className="goalix-chat-list-title">
                            {contact.name}
                            <Badge variant="outline" className="goalix-chat-role-badge">
                              {contactRoleLabel(contact.type, t)}
                            </Badge>
                          </span>
                          {contact.subtitle && (
                            <span className="goalix-chat-list-subtitle">
                              {formatContactSubtitle(contact.subtitle, t)}
                            </span>
                          )}
                        </span>
                        <span className="goalix-chat-group-check">
                          {selectedMember && <Check className="h-3.5 w-3.5" />}
                        </span>
                      </label>
                    );
                  })}
                  {filteredGroupCandidateContacts.length === 0 && (
                    <div className="goalix-chat-empty-state is-compact">
                      {groupCandidateContacts.length === 0 ? "No people available." : t.noContacts}
                    </div>
                  )}
                </div>
                <div className="goalix-chat-group-actions">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={resetGroupComposer}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      creatingGroup ||
                      !groupName.trim() ||
                      groupMemberUserIds.length === 0
                    }
                  >
                    {creatingGroup ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Create
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
        <div className="goalix-chat-scroll">
          {role === "admin" && (
            <ContactSection
              title={t.coaches}
              contacts={filteredContacts.coaches || []}
              onOpen={openConversation}
              t={t}
            />
          )}
          {role === "coach" && (
            <ContactSection
              title={t.admins}
              contacts={filteredContacts.admins || []}
              onOpen={openConversation}
              t={t}
            />
          )}
          {role === "coach" && (
            <ContactSection
              title={t.coaches}
              contacts={filteredContacts.coaches || []}
              onOpen={openConversation}
              t={t}
            />
          )}
          {role === "coach" && (
            <ContactSection
              title={t.players}
              contacts={filteredContacts.players || []}
              onOpen={openConversation}
              t={t}
            />
          )}
          {role === "coach" && (
            <ContactSection
              title={t.parents}
              contacts={filteredContacts.parents || []}
              onOpen={openConversation}
              t={t}
            />
          )}
          {role === "player" && (
            <ContactSection
              title={t.coaches}
              contacts={filteredContacts.coaches || []}
              onOpen={openConversation}
              t={t}
            />
          )}
          {role === "parent" && (
            <ContactSection
              title={t.coaches}
              contacts={filteredContacts.coaches || []}
              onOpen={openConversation}
              t={t}
            />
          )}
          {role === "admin" && (
            <ContactSection
              title={t.players}
              contacts={filteredContacts.players || []}
              onOpen={openConversation}
              t={t}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function ContactSection({
  title,
  contacts,
  onOpen,
  t,
}: {
  title: string;
  contacts: Contact[];
  onOpen: (contact: Contact) => void;
  t: ChatCopy;
}) {
  return (
    <section className="goalix-chat-contact-section">
      <h3>
        {title}
      </h3>
      <div className="goalix-chat-contact-list">
        {contacts.map((contact) => (
          <button
            key={`${contact.type}-${contact.id}-${contact.player_id || "direct"}`}
            onClick={() => onOpen(contact)}
            className="goalix-chat-contact-card"
          >
            <Avatar className="goalix-chat-avatar is-contact">
              <AvatarFallback>
                {getInitials(contact.name)}
              </AvatarFallback>
            </Avatar>
            <span className="goalix-chat-list-copy">
              <span className="goalix-chat-list-title">
                {contact.name}
                <Badge variant="outline" className="goalix-chat-role-badge">
                  {contactRoleLabel(contact.type, t)}
                </Badge>
              </span>
              {contact.subtitle && (
                <span className="goalix-chat-list-subtitle">
                  {formatContactSubtitle(contact.subtitle, t)}
                </span>
              )}
            </span>
          </button>
        ))}
        {contacts.length === 0 && (
          <div className="goalix-chat-empty-state">
            {t.noContacts}
          </div>
        )}
      </div>
    </section>
  );
}
