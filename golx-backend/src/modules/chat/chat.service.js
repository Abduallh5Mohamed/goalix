const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} = require("../../shared/errors");

const chatImageTypes = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
};

function sanitizeFileName(name) {
  return String(name || "chat-image")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

class ChatService {
  constructor(repo) {
    this.repo = repo;
  }

  _assertChatRole(user) {
    if (!["admin", "coach", "player"].includes(user.role)) {
      throw new ForbiddenError("Chat is available for admins, coaches, and players");
    }
  }

  _targetFor(conversation, viewer) {
    if (conversation.type === "admin_coach") {
      return viewer.role === "coach"
        ? {
            type: "admin",
            userId: conversation.admin_user_id,
            name: conversation.admin_name || "Admin",
          }
        : {
            type: "coach",
            id: conversation.coach_id,
            userId: conversation.coach_user_id,
            name: conversation.coach_name || "Coach",
          };
    }

    if (conversation.type === "coach_player") {
      return viewer.role === "player"
        ? {
            type: "coach",
            id: conversation.coach_id,
            userId: conversation.coach_user_id,
            name: conversation.coach_name || "Coach",
          }
        : {
            type: "player",
            id: conversation.player_id,
            userId: conversation.player_user_id,
            name: conversation.player_name || "Player",
          };
    }

    return viewer.role === "player"
      ? {
          type: "admin",
          userId: conversation.admin_user_id,
          name: conversation.admin_name || "Admin",
        }
      : {
          type: "player",
          id: conversation.player_id,
          userId: conversation.player_user_id,
          name: conversation.player_name || "Player",
        };
  }

  _decorateConversation(conversation, viewer) {
    return {
      ...conversation,
      target: this._targetFor(conversation, viewer),
      canSend: conversation.status === "open",
      canClose:
        viewer.role === "admin" &&
        conversation.type === "admin_player_session" &&
        conversation.status === "open",
    };
  }

  _canAccessConversation(user, conversation) {
    if (!conversation || conversation.academy_id !== user.academyId) {
      return false;
    }
    if (user.role === "admin") {
      return (
        ["admin_coach", "admin_player_session"].includes(conversation.type) &&
        conversation.admin_user_id === user.userId
      );
    }
    if (user.role === "coach") {
      return conversation.coach_user_id === user.userId;
    }
    if (user.role === "player") {
      return conversation.player_user_id === user.userId;
    }
    return false;
  }

  async _assertCurrentCoachPlayerAccess(conversation) {
    if (conversation.type !== "coach_player") return;
    const player = await this.repo.findCoachScopedPlayerById(
      conversation.coach_id,
      conversation.academy_id,
      conversation.player_id,
    );
    if (!player) {
      throw new ForbiddenError("Coach no longer has access to this player");
    }
  }

  async _requireConversation(user, conversationId) {
    this._assertChatRole(user);
    const conversation = await this.repo.findConversationById(conversationId);
    if (!conversation || !this._canAccessConversation(user, conversation)) {
      throw new NotFoundError("Conversation", conversationId);
    }
    return conversation;
  }

  async listContacts(user) {
    this._assertChatRole(user);

    if (user.role === "admin") {
      return this.repo.listAdminContacts(user.academyId);
    }

    if (user.role === "coach") {
      const coach = await this.repo.findCoachByUserId(user.userId, user.academyId);
      if (!coach) throw new NotFoundError("Coach profile");
      return this.repo.listCoachContacts(coach.id, user.academyId);
    }

    const player = await this.repo.findPlayerByUserId(user.userId, user.academyId);
    if (!player) throw new NotFoundError("Player profile");
    return this.repo.listPlayerContacts(player, user.academyId);
  }

  async listConversations(user) {
    this._assertChatRole(user);
    const rows = await this.repo.listConversationsForUser(user);
    return rows.map((row) => this._decorateConversation(row, user));
  }

  async getConversation(user, conversationId) {
    const conversation = await this._requireConversation(user, conversationId);
    return this._decorateConversation(conversation, user);
  }

  async createConversation(user, data) {
    this._assertChatRole(user);

    if (data.type === "admin_coach") {
      if (user.role === "admin") {
        if (!data.coachId) {
          throw new BadRequestError("coachId is required for admin-coach chat");
        }
        const coach = await this.repo.findCoachById(data.coachId, user.academyId);
        if (!coach?.user_id) throw new NotFoundError("Coach", data.coachId);
        const existing = await this.repo.findOpenConversation({
          academyId: user.academyId,
          type: "admin_coach",
          adminUserId: user.userId,
          coachUserId: coach.user_id,
        });
        if (existing) return this._decorateConversation(existing, user);
        const conversation = await this.repo.createConversation({
          academy_id: user.academyId,
          type: "admin_coach",
          status: "open",
          admin_user_id: user.userId,
          coach_user_id: coach.user_id,
          coach_id: coach.id,
          opened_by_user_id: user.userId,
        });
        return this._decorateConversation(conversation, user);
      }

      if (user.role === "coach") {
        if (!data.adminUserId) {
          throw new BadRequestError("adminUserId is required for coach-admin chat");
        }
        const coach = await this.repo.findCoachByUserId(user.userId, user.academyId);
        if (!coach) throw new NotFoundError("Coach profile");
        const admin = await this.repo.findAdminByUserId(
          data.adminUserId,
          user.academyId,
        );
        if (!admin?.user_id) throw new NotFoundError("Admin", data.adminUserId);
        const existing = await this.repo.findOpenConversation({
          academyId: user.academyId,
          type: "admin_coach",
          adminUserId: admin.user_id,
          coachUserId: user.userId,
        });
        if (existing) return this._decorateConversation(existing, user);
        const conversation = await this.repo.createConversation({
          academy_id: user.academyId,
          type: "admin_coach",
          status: "open",
          admin_user_id: admin.user_id,
          coach_user_id: user.userId,
          coach_id: coach.id,
          opened_by_user_id: user.userId,
        });
        return this._decorateConversation(conversation, user);
      }

      throw new ForbiddenError("Players cannot open admin chats");
    }

    if (data.type === "admin_player_session") {
      if (user.role !== "admin") {
        throw new ForbiddenError("Only admins can open player support sessions");
      }
      const player = await this.repo.findPlayerById(data.playerId, user.academyId);
      if (!player?.user_id) throw new NotFoundError("Player", data.playerId);
      const existing = await this.repo.findOpenConversation({
        academyId: user.academyId,
        type: "admin_player_session",
        adminUserId: user.userId,
        playerUserId: player.user_id,
      });
      if (existing) return this._decorateConversation(existing, user);
      const conversation = await this.repo.createConversation({
        academy_id: user.academyId,
        type: "admin_player_session",
        status: "open",
        admin_user_id: user.userId,
        player_user_id: player.user_id,
        player_id: player.id,
        opened_by_user_id: user.userId,
      });
      return this._decorateConversation(conversation, user);
    }

    if (data.type !== "coach_player") {
      throw new BadRequestError("Unsupported conversation type");
    }

    if (user.role === "coach") {
      const coach = await this.repo.findCoachByUserId(user.userId, user.academyId);
      if (!coach) throw new NotFoundError("Coach profile");
      const player = await this.repo.findCoachScopedPlayerById(
        coach.id,
        user.academyId,
        data.playerId,
      );
      if (!player?.user_id) throw new NotFoundError("Player", data.playerId);
      const existing = await this.repo.findOpenConversation({
        academyId: user.academyId,
        type: "coach_player",
        coachUserId: user.userId,
        playerUserId: player.user_id,
      });
      if (existing) return this._decorateConversation(existing, user);
      const conversation = await this.repo.createConversation({
        academy_id: user.academyId,
        type: "coach_player",
        status: "open",
        coach_user_id: user.userId,
        player_user_id: player.user_id,
        coach_id: coach.id,
        player_id: player.id,
        opened_by_user_id: user.userId,
      });
      return this._decorateConversation(conversation, user);
    }

    if (user.role === "player") {
      const player = await this.repo.findPlayerByUserId(user.userId, user.academyId);
      if (!player) throw new NotFoundError("Player profile");
      const coach = await this.repo.findCoachById(data.coachId, user.academyId);
      if (!coach?.user_id) throw new NotFoundError("Coach", data.coachId);
      const accessiblePlayer = await this.repo.findCoachScopedPlayerById(
        coach.id,
        user.academyId,
        player.id,
      );
      if (!accessiblePlayer) {
        throw new ForbiddenError("This coach cannot access your profile");
      }
      const existing = await this.repo.findOpenConversation({
        academyId: user.academyId,
        type: "coach_player",
        coachUserId: coach.user_id,
        playerUserId: user.userId,
      });
      if (existing) return this._decorateConversation(existing, user);
      const conversation = await this.repo.createConversation({
        academy_id: user.academyId,
        type: "coach_player",
        status: "open",
        coach_user_id: coach.user_id,
        player_user_id: user.userId,
        coach_id: coach.id,
        player_id: player.id,
        opened_by_user_id: user.userId,
      });
      return this._decorateConversation(conversation, user);
    }

    throw new ForbiddenError("Admins must open an admin-player session for players");
  }

  async closeConversation(user, conversationId) {
    const conversation = await this._requireConversation(user, conversationId);
    if (user.role !== "admin" || conversation.type !== "admin_player_session") {
      throw new ForbiddenError("Only admins can close player support sessions");
    }
    if (conversation.status === "closed") {
      return this._decorateConversation(conversation, user);
    }
    const closed = await this.repo.closeConversation(conversationId, user.userId);
    return this._decorateConversation(closed, user);
  }

  async listMessages(user, conversationId, filters) {
    const conversation = await this._requireConversation(user, conversationId);
    const rows = await this.repo.listMessages(conversation.id, filters);
    return rows.reverse();
  }

  async markConversationRead(user, conversationId) {
    const conversation = await this._requireConversation(user, conversationId);
    const messages = await this.repo.markConversationRead(
      conversation.id,
      user.userId,
    );
    return {
      messages,
      conversation: this._decorateConversation(conversation, user),
      recipientUserIds: this.repo.conversationUserIds(conversation),
    };
  }

  async sendMessage(user, conversationId, { body = "", image = null } = {}) {
    const conversation = await this._requireConversation(user, conversationId);
    await this._assertCurrentCoachPlayerAccess(conversation);

    if (conversation.status !== "open") {
      throw new ForbiddenError("This chat session is closed");
    }

    const trimmedBody = String(body || "").trim();
    const attachment = image
      ? await this.storeChatImageUpload(user, image)
      : null;

    if (!trimmedBody && !attachment) {
      throw new BadRequestError("Message text or image is required");
    }

    const message = await this.repo.insertMessage(conversation, {
      senderUserId: user.userId,
      body: trimmedBody,
      attachmentUrl: attachment?.attachmentUrl,
      attachmentOriginalName: attachment?.fileName,
      attachmentMimeType: attachment?.mimeType,
      attachmentSize: attachment?.sizeBytes,
    });
    const updatedConversation = await this.repo.findConversationById(conversation.id);
    return {
      message,
      conversation: this._decorateConversation(updatedConversation, user),
      recipientUserIds: this.repo.conversationUserIds(conversation),
    };
  }

  async editMessage(user, conversationId, messageId, body) {
    const conversation = await this._requireConversation(user, conversationId);
    await this._assertCurrentCoachPlayerAccess(conversation);
    if (conversation.status !== "open") {
      throw new ForbiddenError("This chat session is closed");
    }

    const message = await this.repo.findMessageForMutation(
      messageId,
      conversation.id,
    );
    if (!message) throw new NotFoundError("Message", messageId);
    if (message.sender_user_id !== user.userId) {
      throw new ForbiddenError("You can only edit your own messages");
    }

    const updated = await this.repo.updateMessageBody(
      messageId,
      String(body || "").trim(),
    );
    const updatedConversation = await this.repo.findConversationById(
      conversation.id,
    );

    return {
      message: updated,
      conversation: this._decorateConversation(updatedConversation, user),
      recipientUserIds: this.repo.conversationUserIds(conversation),
    };
  }

  async deleteMessage(user, conversationId, messageId) {
    const conversation = await this._requireConversation(user, conversationId);
    await this._assertCurrentCoachPlayerAccess(conversation);
    if (conversation.status !== "open") {
      throw new ForbiddenError("This chat session is closed");
    }

    const message = await this.repo.findMessageForMutation(
      messageId,
      conversation.id,
    );
    if (!message) throw new NotFoundError("Message", messageId);
    if (message.sender_user_id !== user.userId) {
      throw new ForbiddenError("You can only delete your own messages");
    }

    const deleted = await this.repo.softDeleteMessage(messageId, user.userId);
    const updatedConversation = await this.repo.refreshConversationLastMessageAt(
      conversation.id,
    );
    return {
      message: {
        id: deleted.id,
        conversation_id: deleted.conversation_id,
        deleted_at: deleted.deleted_at,
      },
      conversation: this._decorateConversation(updatedConversation, user),
      recipientUserIds: this.repo.conversationUserIds(conversation),
    };
  }

  async storeChatImageUpload(user, { originalName, mimeType, buffer }) {
    const normalizedMimeType = String(mimeType || "").toLowerCase();
    const extension = chatImageTypes[normalizedMimeType];
    if (!extension) {
      throw new BadRequestError("Chat image must be PNG, JPG, JPEG, or WEBP.");
    }
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new BadRequestError("Uploaded image is empty.");
    }
    if (buffer.length > 8 * 1024 * 1024) {
      throw new BadRequestError("Chat image must be 8MB or smaller.");
    }

    const academySegment = String(user.academyId || "shared").replace(
      /[^a-zA-Z0-9-]/g,
      "",
    );
    const storedName = `${Date.now()}-${randomUUID()}${extension}`;
    const uploadDir = path.resolve(
      __dirname,
      "../../../uploads/chat",
      academySegment,
    );
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, storedName), buffer);

    return {
      fileName: sanitizeFileName(originalName || "chat-image"),
      attachmentUrl: `/uploads/chat/${academySegment}/${storedName}`,
      mimeType: normalizedMimeType,
      sizeBytes: buffer.length,
    };
  }

  conversationUserIds(conversation) {
    return this.repo.conversationUserIds(conversation);
  }

  async canUserAccessAttachment(user, attachmentUrl) {
    if (!user) return false;
    const message = await this.repo.findMessageByAttachmentUrl(attachmentUrl);
    if (!message) return false;
    const conversation = await this.repo.findConversationById(message.conversation_id);
    return this._canAccessConversation(user, conversation);
  }
}

module.exports = ChatService;
