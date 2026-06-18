let io = null;

function setChatRealtime(server) {
  io = server;
}

function emitToUsers(userIds, event, payload) {
  if (!io) return;
  for (const userId of new Set(userIds.filter(Boolean))) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}

function emitMessage(message, conversation, userIds) {
  if (!io) return;
  io.to(`chat:${message.conversation_id}`).emit("chat:message", message);
  emitToUsers(userIds, "chat:message", message);
  emitToUsers(userIds, "chat:conversation", conversation);
}

function emitMessageUpdated(message, conversation, userIds) {
  if (!io) return;
  io.to(`chat:${message.conversation_id}`).emit("chat:message_updated", message);
  emitToUsers(userIds, "chat:message_updated", message);
  emitToUsers(userIds, "chat:conversation", conversation);
}

function emitMessageDeleted(message, conversation, userIds) {
  if (!io) return;
  if (message.visibility === "self") {
    emitToUsers(userIds, "chat:message_deleted", message);
    emitToUsers(userIds, "chat:conversation", conversation);
    return;
  }
  io.to(`chat:${message.conversation_id}`).emit("chat:message_deleted", message);
  emitToUsers(userIds, "chat:message_deleted", message);
  emitToUsers(userIds, "chat:conversation", conversation);
}

function emitNotifications(notifications) {
  if (!io || !notifications?.length) return;
  for (const notification of notifications) {
    emitToUsers([notification.user_id], "notification:new", notification);
  }
}

function emitNotificationRead(notification) {
  if (!io || !notification?.user_id) return;
  emitToUsers([notification.user_id], "notification:read", notification);
}

function emitNotificationsReadAll(userId) {
  if (!io || !userId) return;
  emitToUsers([userId], "notification:read_all", { user_id: userId });
}

function emitMessagesRead(messages, conversation, userIds) {
  if (!io || !messages.length) return;
  io.to(`chat:${conversation.id}`).emit("chat:messages_read", messages);
  emitToUsers(userIds, "chat:messages_read", messages);
}

function emitConversation(conversation, userIds) {
  if (!io) return;
  io.to(`chat:${conversation.id}`).emit("chat:conversation", conversation);
  emitToUsers(userIds, "chat:conversation", conversation);
}

function emitSessionClosed(conversation, userIds) {
  if (!io) return;
  io.to(`chat:${conversation.id}`).emit("chat:session_closed", conversation);
  emitToUsers(userIds, "chat:session_closed", conversation);
}

module.exports = {
  emitConversation,
  emitMessage,
  emitMessageDeleted,
  emitMessageUpdated,
  emitMessagesRead,
  emitNotificationRead,
  emitNotifications,
  emitNotificationsReadAll,
  emitSessionClosed,
  setChatRealtime,
};
