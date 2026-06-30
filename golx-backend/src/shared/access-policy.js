function isChatGroupMember(user, conversation) {
    return conversation.type === 'chat_group'
        && Array.isArray(conversation.group_member_user_ids)
        && conversation.group_member_user_ids.includes(user.userId);
}

function canAccessConversation(user, conversation) {
    if (!user || !conversation || conversation.academy_id !== user.academyId) {
        return false;
    }
    if (user.role === 'admin') {
        return (
            ['admin_coach', 'admin_player_session'].includes(conversation.type)
            && conversation.admin_user_id === user.userId
        ) || isChatGroupMember(user, conversation);
    }
    if (user.role === 'coach') {
        return conversation.coach_user_id === user.userId || isChatGroupMember(user, conversation);
    }
    if (user.role === 'player') {
        return conversation.player_user_id === user.userId || isChatGroupMember(user, conversation);
    }
    if (user.role === 'parent') {
        return conversation.parent_user_id === user.userId;
    }
    return false;
}

function canAccessAttachment(user, message, conversation) {
    if (!message?.attachment_url || message.conversation_id !== conversation?.id) return false;
    return canAccessConversation(user, conversation);
}

function canAccessPlayerRecord(user, player, { write = false, coachCanAccess = false } = {}) {
    if (!user || !player || player.academy_id !== user.academyId) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'player') return !write && player.user_id === user.userId;
    if (user.role === 'parent') return !write && player.id === user.linkedPlayerId;
    if (user.role === 'coach') return Boolean(coachCanAccess);
    return false;
}

function canAccessAiInsight(user, player, options = {}) {
    return canAccessPlayerRecord(user, player, { ...options, write: false });
}

function canParentAccessChild(parentUserId, child, capability) {
    if (!parentUserId || !child) return false;
    if (child.parent_user_id && child.parent_user_id !== parentUserId) return false;
    if (capability === 'progress' && child.can_view_progress === false) return false;
    if (capability === 'message_coach' && child.can_message_coach === false) return false;
    return true;
}

module.exports = {
    canAccessAttachment,
    canAccessAiInsight,
    canAccessConversation,
    canAccessPlayerRecord,
    canParentAccessChild,
};
