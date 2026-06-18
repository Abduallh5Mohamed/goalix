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
import { forgetAuthSession, hasAuthSessionMarker, rememberAuthSession } from "@/lib/auth/session";
import { getApiBaseUrl } from "@/lib/api/baseUrl";

const API_BASE = getApiBaseUrl();

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
  deleted_at?: string | null;
  deleted_by_user_id?: string | null;
  visibility?: "self" | "everyone";
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

function conversationLabel(conversation: Conversation) {
  if (conversation.type === "admin_player_session") return "Admin session";
  if (conversation.type === "admin_coach") return "Admin";
  return "Coach";
}

function formatContactSubtitle(subtitle?: string | null) {
  if (!subtitle) return "";

  const normalized = subtitle.trim().toLowerCase();
  const labels: Record<string, string> = {
    admin: "Admin",
    coach: "Coach",
    player: "Player",
    head_coach: "Head coach",
    assistant_coach: "Assistant coach",
    goalkeeper_coach: "Goalkeeper coach",
    fitness_coach: "Fitness coach",
  };

  return labels[normalized] || subtitle.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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

const allowedImageTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);
const maxChatImageBytes = 8 * 1024 * 1024;

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
    socket.on("chat:message_deleted", handleMessageDeleted);
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
  }, [handleMessageDeleted, isAuthenticated, loadConversations, upsertMessage, upsertMessages]);

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

  function handleImageChange(file?: File | null) {
    if (!file) {
      setImage(null);
      return;
    }
    if (!allowedImageTypes.has(file.type)) {
      setError("Chat image must be PNG, JPG, JPEG, or WEBP.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > maxChatImageBytes) {
      setError("Chat image must be 8MB or smaller.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setError("");
    setImage(file);
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
      setError(err instanceof Error ? err.message : "Unable to delete message");
    } finally {
      setDeletingId(null);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="goalix-chat-empty-auth">
        Sign in again to use chat.
      </div>
    );
  }

  return (
    <div className="goalix-chat-shell">
      <aside className="goalix-chat-panel goalix-chat-conversations">
        <div className="goalix-chat-panel-head">
          <MessageSquare className="goalix-chat-head-icon" />
          <h1>Chats</h1>
          {loading && <Loader2 className="goalix-chat-loading" />}
        </div>
        <div className="goalix-chat-scroll">
          {filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedId(conversation.id)}
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
                    (conversation.last_attachment_url ? "Image" : conversationLabel(conversation))}
                </span>
              </span>
              {conversation.status === "closed" && <Lock className="goalix-chat-lock" />}
            </button>
          ))}
          {!loading && filteredConversations.length === 0 && (
            <div className="goalix-chat-empty-state">
              {query.trim() ? "No chats match your search." : "No chats yet."}
            </div>
          )}
        </div>
      </aside>

      <main className="goalix-chat-panel goalix-chat-thread">
        <div className="goalix-chat-thread-head">
          {selected ? (
            <>
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
                    {selected.status}
                  </Badge>
                  <span>{conversationLabel(selected)}</span>
                </div>
              </div>
              {selected.canClose && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="goalix-chat-close-session"
                  onClick={closeSession}
                >
                  Close session
                </Button>
              )}
            </>
          ) : (
            <span className="goalix-chat-muted">Select a chat</span>
          )}
        </div>

        <div className="goalix-chat-messages">
          {messagesLoading && (
            <div className="goalix-chat-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {!messagesLoading && selected && messages.length === 0 && (
            <div className="goalix-chat-center">
              No messages yet.
            </div>
          )}
          {!messagesLoading && !selected && (
            <div className="goalix-chat-center">
              No chat selected.
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
                      <span>{mine ? "You" : message.sender_name || "User"}</span>
                      <span>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {message.edited_at && !deletedForEveryone && <span>edited</span>}
                      {mine && (
                        <span className="goalix-chat-message-actions">
                          <MessageReceipt message={message} />
                          {selected?.canSend && message.body && (
                            <button
                              type="button"
                              onClick={() => startEdit(message)}
                              className="goalix-chat-icon-button"
                              title="Edit message"
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
                              title="Delete message"
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
                              Delete for me
                            </DropdownMenuItem>
                            {mine && !deletedForEveryone && (
                              <>
                                <DropdownMenuSeparator className="bg-[#2b4661]" />
                                <DropdownMenuItem
                                  className="cursor-pointer text-red-200 focus:bg-red-500/15 focus:text-red-100"
                                  onClick={() => deleteMessage(message, "everyone")}
                                >
                                  Delete for everyone
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {message.body && (
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
                          alt={message.attachment_original_name || "Chat image"}
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
          {selected?.status === "closed" && (
            <div className="goalix-chat-alert">
              <Lock className="h-4 w-4" />
              Session closed.
            </div>
          )}
          {editingMessage && (
            <div className="goalix-chat-alert is-editing">
              <Edit3 className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate">Editing message</span>
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
              className="goalix-chat-input"
            />
            <Button
              type="submit"
              disabled={
                !selected?.canSend ||
                sending ||
                (editingMessage ? !body.trim() : !body.trim() && !image)
              }
              className="goalix-chat-send-button"
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

      <aside className="goalix-chat-panel goalix-chat-contacts">
        <div className="goalix-chat-panel-head">
          {role === "admin" ? <Shield className="goalix-chat-head-icon" /> : role === "coach" ? <Users className="goalix-chat-head-icon" /> : <UserRound className="goalix-chat-head-icon" />}
          <h2>Contacts</h2>
        </div>
        <div className="goalix-chat-search-wrap">
          <div className="goalix-chat-search">
            <Search />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="goalix-chat-search-input"
              placeholder="Search"
            />
          </div>
        </div>
        <div className="goalix-chat-scroll">
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
    <section className="goalix-chat-contact-section">
      <h3>
        {title}
      </h3>
      <div className="goalix-chat-contact-list">
        {contacts.map((contact) => (
          <button
            key={`${contact.type}-${contact.id}`}
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
              </span>
              {contact.subtitle && (
                <span className="goalix-chat-list-subtitle">
                  {formatContactSubtitle(contact.subtitle)}
                </span>
              )}
            </span>
          </button>
        ))}
        {contacts.length === 0 && (
          <div className="goalix-chat-empty-state">
            No contacts.
          </div>
        )}
      </div>
    </section>
  );
}
