"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  Check,
  CheckCheck,
  Edit3,
  ImagePlus,
  Loader2,
  Lock,
  MessageSquare,
  Search,
  Send,
  Shield,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import { useCurrentUser } from "@/lib/auth/auth-context";
import { forgetAuthSession, hasAuthSessionMarker, rememberAuthSession } from "@/lib/auth/session";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type ChatRole = "admin" | "coach" | "player";
type ContactType = "admin" | "coach" | "player";
type ConversationType = "admin_coach" | "coach_player" | "admin_player_session";

type Contact = {
  type: ContactType;
  id: string;
  user_id: string;
  name: string;
  subtitle?: string | null;
};

type Conversation = {
  id: string;
  type: ConversationType;
  status: "open" | "closed";
  admin_user_id?: string | null;
  coach_user_id?: string | null;
  player_user_id?: string | null;
  coach_id?: string | null;
  player_id?: string | null;
  target: {
    type: "admin" | "coach" | "player";
    id?: string | null;
    userId?: string | null;
    name: string;
  };
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
};

type ContactsResponse = {
  admins?: Contact[];
  coaches?: Contact[];
  players?: Contact[];
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { message?: string };
};

async function apiJson<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}/api/v1/chat${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (res.status === 401 && retry && hasAuthSessionMarker()) {
    const refresh = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
    if (!refresh?.ok) {
      forgetAuthSession();
    } else {
      rememberAuthSession();
    }
    return apiJson<T>(path, init, false);
  }

  const payload = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
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

function conversationAccent(type: ConversationType) {
  if (type === "admin_player_session") return "border-cyan-300/35 bg-cyan-300/10";
  if (type === "admin_coach") return "border-lime-300/30 bg-lime-300/10";
  return "border-white/10 bg-white/[0.03]";
}

function conversationLabel(conversation: Conversation) {
  if (conversation.type === "admin_player_session") return "Admin session";
  if (conversation.type === "admin_coach") return "Admin";
  return "Coach";
}

function MessageReceipt({ message }: { message: Message }) {
  if (message.read_at) {
    return (
      <span title="Read" className="inline-flex text-cyan-300">
        <CheckCheck className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (message.delivered_at) {
    return (
      <span title="Delivered" className="inline-flex text-slate-400">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }

  return null;
}

export function ChatWorkspace({ role }: { role: ChatRole }) {
  const { user, isAuthenticated } = useCurrentUser();
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

  const removeMessage = useCallback((message: Pick<Message, "id" | "conversation_id">) => {
    if (message.conversation_id !== selectedRef.current) return;
    setMessages((prev) => prev.filter((item) => item.id !== message.id));
    setEditingMessage((current) => (current?.id === message.id ? null : current));
  }, []);

  const loadConversations = useCallback(async () => {
    const conversationsData = await apiJson<Conversation[]>("/conversations");
    setConversations(conversationsData);
    setSelectedId((current) => current || conversationsData[0]?.id || null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
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
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setContacts({});
      setConversations([]);
      setMessages([]);
      setSelectedId(null);
      return;
    }
    void load();
  }, [isAuthenticated, load]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = io(API_BASE, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("chat:message", upsertMessage);
    socket.on("chat:message_updated", upsertMessage);
    socket.on("chat:message_deleted", removeMessage);
    socket.on("chat:messages_read", upsertMessages);
    socket.on("chat:conversation", () => {
      void loadConversations();
    });
    socket.on("chat:session_closed", () => {
      void loadConversations();
    });
    socket.on("connect_error", () => {
      setError("Live chat connection failed");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, loadConversations, removeMessage, upsertMessage, upsertMessages]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selectedId) return;
    socket.emit("chat:join", { conversationId: selectedId });
    return () => {
      socket.emit("chat:leave", { conversationId: selectedId });
    };
  }, [selectedId]);

  useEffect(() => {
    if (!isAuthenticated || !selectedId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    setError("");
    apiJson<Message[]>(`/conversations/${selectedId}/messages`)
      .then(setMessages)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load messages"))
      .finally(() => setMessagesLoading(false));
  }, [isAuthenticated, selectedId]);

  useEffect(() => {
    if (!isAuthenticated || !selectedId || !user?.id) return;
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
  }, [isAuthenticated, messages, selectedId, upsertMessages, user?.id]);

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
    };
  }, [contacts, query]);

  const filteredConversations = useMemo(() => {
    const needle = normalizeSearch(query);
    if (!needle) return conversations;
    return conversations.filter((conversation) =>
      normalizeSearch(
        `${conversation.target.name} ${conversation.last_message_body || ""} ${conversationLabel(conversation)}`,
      ).includes(needle),
    );
  }, [conversations, query]);

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
      } else {
        return;
      }
      const conversation = await apiJson<Conversation>("/conversations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      upsertConversation(conversation);
      setSelectedId(conversation.id);
      setEditingMessage(null);
      setBody("");
      setImage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open chat");
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
      setError(err instanceof Error ? err.message : "Unable to close session");
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || sending) return;
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
      setError(err instanceof Error ? err.message : "Unable to send message");
    } finally {
      setSending(false);
    }
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

  async function deleteMessage(message: Message) {
    if (!selected || deletingId) return;
    setDeletingId(message.id);
    setError("");
    try {
      await apiJson<{ id: string; conversation_id: string }>(
        `/conversations/${selected.id}/messages/${message.id}`,
        { method: "DELETE" },
      );
      removeMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete message");
    } finally {
      setDeletingId(null);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="grid min-h-[calc(100vh-132px)] place-items-center rounded-lg border border-[#253f5a] bg-[#06111f]/86 text-slate-300">
        Sign in again to use chat.
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100vh-132px)] gap-4 text-slate-100 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
      <aside className="overflow-hidden rounded-lg border border-[#253f5a] bg-[#06111f]/86">
        <div className="flex h-14 items-center gap-3 border-b border-[#253f5a] px-4">
          <MessageSquare className="h-5 w-5 text-lime-300" />
          <h1 className="text-base font-semibold">Chats</h1>
          {loading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-cyan-300" />}
        </div>
        <div className="max-h-[calc(100vh-190px)] overflow-y-auto p-3">
          {filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedId(conversation.id)}
              className={cn(
                "mb-2 flex w-full items-center gap-3 rounded-lg border p-3 text-left transition",
                selectedId === conversation.id
                  ? "border-lime-300/50 bg-lime-300/10"
                  : cn(conversationAccent(conversation.type), "hover:border-cyan-300/35"),
              )}
            >
              <Avatar className="h-10 w-10 border border-white/10">
                <AvatarFallback className="bg-[#0a1a2d] text-xs font-bold text-cyan-200">
                  {getInitials(conversation.target.name)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {conversation.target.name}
                </span>
                <span className="block truncate text-xs text-slate-400">
                  {conversation.last_message_body ||
                    (conversation.last_attachment_url ? "Image" : conversationLabel(conversation))}
                </span>
              </span>
              {conversation.status === "closed" && <Lock className="h-4 w-4 text-slate-500" />}
            </button>
          ))}
          {!loading && filteredConversations.length === 0 && (
            <div className="rounded-lg border border-dashed border-[#2b4661] p-5 text-center text-sm text-slate-400">
              {query.trim() ? "No chats match your search." : "No chats yet."}
            </div>
          )}
        </div>
      </aside>

      <main className="flex min-h-[620px] flex-col overflow-hidden rounded-lg border border-[#253f5a] bg-[#06111f]/88">
        <div className="flex min-h-16 items-center gap-3 border-b border-[#253f5a] px-4">
          {selected ? (
            <>
              <Avatar className="h-10 w-10 border border-lime-300/25">
                <AvatarFallback className="bg-[#0a1a2d] text-sm font-bold text-lime-300">
                  {getInitials(selected.target.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{selected.target.name}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant={selected.status === "open" ? "success" : "secondary"}
                    className="rounded-full"
                  >
                    {selected.status}
                  </Badge>
                  <span className="text-xs text-slate-400">{conversationLabel(selected)}</span>
                </div>
              </div>
              {selected.canClose && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="ml-auto border-red-400/35 text-red-200 hover:bg-red-500/10"
                  onClick={closeSession}
                >
                  Close session
                </Button>
              )}
            </>
          ) : (
            <span className="text-sm text-slate-400">Select a chat</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          {messagesLoading && (
            <div className="grid h-full place-items-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {!messagesLoading && selected && messages.length === 0 && (
            <div className="grid h-full place-items-center text-sm text-slate-400">
              No messages yet.
            </div>
          )}
          {!messagesLoading && !selected && (
            <div className="grid h-full place-items-center text-sm text-slate-400">
              No chat selected.
            </div>
          )}
          <div className="space-y-3">
            {messages.map((message) => {
              const mine = message.sender_user_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[min(680px,82%)] rounded-lg border px-3 py-2",
                      mine
                        ? "border-lime-300/35 bg-lime-300/12"
                        : "border-[#2b4661] bg-white/[0.04]",
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{mine ? "You" : message.sender_name || "User"}</span>
                      <span>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {message.edited_at && <span>edited</span>}
                      {mine && (
                        <span className="ml-auto flex items-center gap-1">
                          <MessageReceipt message={message} />
                          {selected?.canSend && message.body && (
                            <button
                              type="button"
                              onClick={() => startEdit(message)}
                              className="rounded p-1 text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
                              title="Edit message"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {selected?.canSend && (
                            <button
                              type="button"
                              onClick={() => deleteMessage(message)}
                              disabled={deletingId === message.id}
                              className="rounded p-1 text-slate-400 transition hover:bg-red-500/15 hover:text-red-200 disabled:opacity-50"
                              title="Delete message"
                            >
                              {deletingId === message.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                    {message.body && (
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">
                        {message.body}
                      </p>
                    )}
                    {message.attachment_url && (
                      <a
                        href={absoluteUploadUrl(message.attachment_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block overflow-hidden rounded-md border border-white/10"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={absoluteUploadUrl(message.attachment_url)}
                          alt={message.attachment_original_name || "Chat image"}
                          crossOrigin="use-credentials"
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

        <form onSubmit={sendMessage} className="border-t border-[#253f5a] p-3">
          {error && (
            <div className="mb-3 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}
          {selected?.status === "closed" && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-slate-500/25 bg-slate-500/10 px-3 py-2 text-sm text-slate-300">
              <Lock className="h-4 w-4" />
              Session closed.
            </div>
          )}
          {editingMessage && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-lime-300/25 bg-lime-300/10 px-3 py-2 text-sm text-lime-100">
              <Edit3 className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate">Editing message</span>
              <button type="button" onClick={cancelEdit} className="text-lime-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {image && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
              <ImagePlus className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate">{image.name}</span>
              <button type="button" onClick={() => setImage(null)} className="text-cyan-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(event) => setImage(event.target.files?.[0] || null)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!selected?.canSend || sending || Boolean(editingMessage)}
              className="shrink-0 border-[#2b4661] bg-white/[0.03]"
              onClick={() => fileRef.current?.click()}
              title="Attach image"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Textarea
              ref={textRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={2}
              maxLength={4000}
              disabled={!selected?.canSend || sending}
              placeholder={selected?.canSend ? "Message" : ""}
              className="min-h-11 resize-none border-[#2b4661] bg-[#07172a]/90 text-slate-100 placeholder:text-slate-500"
            />
            <Button
              type="submit"
              disabled={
                !selected?.canSend ||
                sending ||
                (editingMessage ? !body.trim() : !body.trim() && !image)
              }
              className="h-11 shrink-0 gap-2 bg-lime-300 text-[#06111f] hover:bg-lime-200"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingMessage ? (
                <Check className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {editingMessage ? "Save" : "Send"}
            </Button>
          </div>
        </form>
      </main>

      <aside className="overflow-hidden rounded-lg border border-[#253f5a] bg-[#06111f]/86">
        <div className="flex h-14 items-center gap-3 border-b border-[#253f5a] px-4">
          {role === "admin" ? <Shield className="h-5 w-5 text-cyan-300" /> : role === "coach" ? <Users className="h-5 w-5 text-cyan-300" /> : <UserRound className="h-5 w-5 text-cyan-300" />}
          <h2 className="text-base font-semibold">Contacts</h2>
        </div>
        <div className="border-b border-[#253f5a] p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="border-[#2b4661] bg-[#07172a]/90 pl-9 text-slate-100"
              placeholder="Search"
            />
          </div>
        </div>
        <div className="max-h-[calc(100vh-246px)] overflow-y-auto p-3">
          {role === "admin" && (
            <ContactSection
              title="Coaches"
              contacts={filteredContacts.coaches || []}
              onOpen={openConversation}
            />
          )}
          {role === "coach" && (
            <ContactSection
              title="Admins"
              contacts={filteredContacts.admins || []}
              onOpen={openConversation}
            />
          )}
          <ContactSection
            title={role === "player" ? "Coaches" : "Players"}
            contacts={
              role === "player"
                ? filteredContacts.coaches || []
                : filteredContacts.players || []
            }
            onOpen={openConversation}
          />
        </div>
      </aside>
    </div>
  );
}

function ContactSection({
  title,
  contacts,
  onOpen,
}: {
  title: string;
  contacts: Contact[];
  onOpen: (contact: Contact) => void;
}) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </h3>
      <div className="space-y-2">
        {contacts.map((contact) => (
          <button
            key={`${contact.type}-${contact.id}`}
            onClick={() => onOpen(contact)}
            className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-lime-300/40 hover:bg-lime-300/10"
          >
            <Avatar className="h-9 w-9 border border-white/10">
              <AvatarFallback className="bg-[#0a1a2d] text-xs font-bold text-cyan-200">
                {getInitials(contact.name)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-100">
                {contact.name}
              </span>
              {contact.subtitle && (
                <span className="block truncate text-xs text-slate-500">
                  {contact.subtitle}
                </span>
              )}
            </span>
          </button>
        ))}
        {contacts.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#2b4661] px-3 py-5 text-center text-sm text-slate-500">
            No contacts.
          </div>
        )}
      </div>
    </section>
  );
}
