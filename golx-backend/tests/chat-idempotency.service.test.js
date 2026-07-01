require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });

const ChatService = require('../src/modules/chat/chat.service');

describe('chat idempotency contract', () => {
    test('sendMessage passes clientMessageId and does not invalidate caches for idempotent duplicate', async () => {
        const conversation = {
            id: 'conversation-1',
            academy_id: 'academy-1',
            type: 'admin_coach',
            status: 'open',
            admin_user_id: 'admin-user',
            coach_user_id: 'coach-user',
        };
        const message = {
            id: 'message-1',
            conversation_id: conversation.id,
            sender_user_id: 'admin-user',
            body: 'Hello',
        };
        const repo = {
            db: jest.fn(),
            findConversationById: jest.fn(async () => conversation),
            insertMessage: jest.fn(async () => ({
                message,
                event: null,
                idempotent: true,
            })),
            conversationUserIds: jest.fn(() => ['admin-user', 'coach-user']),
        };
        const service = new ChatService(repo);
        service._invalidateConversationCaches = jest.fn();

        const result = await service.sendMessage(
            { role: 'admin', userId: 'admin-user', academyId: 'academy-1' },
            conversation.id,
            { body: 'Hello', clientMessageId: 'client-123' },
        );

        expect(repo.insertMessage).toHaveBeenCalledWith(conversation, expect.objectContaining({
            clientMessageId: 'client-123',
            body: 'Hello',
        }));
        expect(service._invalidateConversationCaches).not.toHaveBeenCalled();
        expect(result.idempotent).toBe(true);
    });

    test('read receipts are idempotent and return no realtime event when nothing changes', async () => {
        const conversation = {
            id: 'conversation-1',
            academy_id: 'academy-1',
            type: 'coach_player',
            status: 'open',
            coach_user_id: 'coach-user',
            player_user_id: 'player-user',
        };
        const repo = {
            db: jest.fn(),
            findConversationById: jest.fn(async () => conversation),
            markConversationRead: jest.fn(async () => ({
                messages: [],
                event: null,
            })),
            conversationUserIds: jest.fn(() => ['coach-user', 'player-user']),
        };
        const service = new ChatService(repo);

        const result = await service.markConversationRead(
            { role: 'player', userId: 'player-user', academyId: 'academy-1' },
            conversation.id,
        );

        expect(repo.markConversationRead).toHaveBeenCalledWith(conversation.id, 'player-user');
        expect(result.messages).toEqual([]);
        expect(result.event).toBeNull();
        expect(result.recipientUserIds).toEqual(['coach-user', 'player-user']);
    });
});
