const {
    canAccessConversation,
    canAccessPlayerRecord,
    canParentAccessChild,
} = require('../src/shared/access-policy');

describe('access policy characterization', () => {
    test('parent can read only the linked player record', () => {
        const parent = {
            role: 'parent',
            userId: 'parent-user',
            academyId: 'academy-1',
            linkedPlayerId: 'player-1',
        };

        expect(canAccessPlayerRecord(parent, {
            id: 'player-1',
            academy_id: 'academy-1',
        })).toBe(true);

        expect(canAccessPlayerRecord(parent, {
            id: 'player-2',
            academy_id: 'academy-1',
        })).toBe(false);

        expect(canAccessPlayerRecord(parent, {
            id: 'player-1',
            academy_id: 'academy-1',
        }, { write: true })).toBe(false);
    });

    test('parent child capabilities honor link ownership and visibility flags', () => {
        expect(canParentAccessChild('parent-1', {
            parent_user_id: 'parent-1',
            can_view_progress: true,
            can_message_coach: true,
        }, 'progress')).toBe(true);

        expect(canParentAccessChild('parent-1', {
            parent_user_id: 'parent-2',
            can_view_progress: true,
        }, 'progress')).toBe(false);

        expect(canParentAccessChild('parent-1', {
            parent_user_id: 'parent-1',
            can_view_progress: false,
        }, 'progress')).toBe(false);
    });

    test('chat access remains scoped to academy and participant user ids', () => {
        const user = { role: 'coach', userId: 'coach-user', academyId: 'academy-1' };
        expect(canAccessConversation(user, {
            type: 'coach_player',
            academy_id: 'academy-1',
            coach_user_id: 'coach-user',
        })).toBe(true);

        expect(canAccessConversation(user, {
            type: 'coach_player',
            academy_id: 'academy-2',
            coach_user_id: 'coach-user',
        })).toBe(false);

        expect(canAccessConversation(user, {
            type: 'coach_player',
            academy_id: 'academy-1',
            coach_user_id: 'another-coach',
        })).toBe(false);
    });
});
