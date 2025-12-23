import { db } from '../utils/db';
import { Group, Profile, GroupMember } from '../types/group';

export const groupService = {
    /**
     * Fetch all groups the user belongs to
     */
    async getGroups(userId: string): Promise<Group[]> {
        const result = await db.execute({
            sql: `
        SELECT g.*, (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
        FROM groups g
        JOIN group_members gm ON gm.group_id = g.id
        WHERE gm.user_id = ?
        ORDER BY g.created_at DESC
      `,
            args: [userId],
        });

        return result.rows as unknown as Group[];
    },

    /**
     * Create a new group (with subscription limit check)
     */
    async createGroup(userId: string, name: string, iconUrl?: string): Promise<Group> {
        // 1. Check user limits
        const profileResult = await db.execute({
            sql: 'SELECT max_groups, (SELECT COUNT(*) FROM groups WHERE created_by = ?) as current_count FROM profiles WHERE id = ?',
            args: [userId, userId],
        });

        const profile = profileResult.rows[0];
        if (profile && (profile.current_count as number) >= (profile.max_groups as number)) {
            throw new Error(`Group limit reached. Your limit is ${profile.max_groups} groups.`);
        }

        // 2. Create the group
        const groupId = Math.random().toString(36).substring(2, 15);
        await db.execute({
            sql: 'INSERT INTO groups (id, name, icon_url, created_by) VALUES (?, ?, ?, ?)',
            args: [groupId, name, iconUrl || null, userId],
        });

        // 3. Automatically add creator as member
        await db.execute({
            sql: 'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
            args: [groupId, userId],
        });

        const result = await db.execute({
            sql: 'SELECT * FROM groups WHERE id = ?',
            args: [groupId],
        });

        return result.rows[0] as unknown as Group;
    },

    /**
     * Delete a group (Creator only)
     */
    async deleteGroup(groupId: string, userId: string): Promise<void> {
        const groupResult = await db.execute({
            sql: 'SELECT created_by FROM groups WHERE id = ?',
            args: [groupId],
        });

        const group = groupResult.rows[0];
        if (!group || group.created_by !== userId) {
            throw new Error("Only the group creator can delete the group.");
        }

        await db.execute({
            sql: 'DELETE FROM groups WHERE id = ?',
            args: [groupId],
        });
    },

    /**
     * Add a member to a group (with member limit check)
     */
    async addMember(groupId: string, creatorId: string, newUserEmail: string): Promise<void> {
        // 1. Check if the requester is the creator
        const groupResult = await db.execute({
            sql: 'SELECT created_by FROM groups WHERE id = ?',
            args: [groupId],
        });
        if (groupResult.rows[0]?.created_by !== creatorId) {
            throw new Error("Only the group creator can add members.");
        }

        // 2. Get new user profile
        const userResult = await db.execute({
            sql: 'SELECT id FROM profiles WHERE email = ?',
            args: [newUserEmail],
        });
        const newUser = userResult.rows[0];
        if (!newUser) throw new Error("User with this email not found.");

        // 3. Check member limits for this creator
        const profileResult = await db.execute({
            sql: 'SELECT max_members_per_group, (SELECT COUNT(*) FROM group_members WHERE group_id = ?) as current_members FROM profiles WHERE id = ?',
            args: [groupId, creatorId],
        });
        const profile = profileResult.rows[0];
        if (profile && (profile.current_members as number) >= (profile.max_members_per_group as number)) {
            throw new Error(`Member limit reached. Max members per group is ${profile.max_members_per_group}.`);
        }

        // 4. Add member
        await db.execute({
            sql: 'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
            args: [groupId, newUser.id as string],
        });
    },

    /**
     * Remove a member (Creator only, cannot remove self)
     */
    async removeMember(groupId: string, creatorId: string, memberUserId: string): Promise<void> {
        if (creatorId === memberUserId) {
            throw new Error("You cannot remove yourself from the group.");
        }

        const groupResult = await db.execute({
            sql: 'SELECT created_by FROM groups WHERE id = ?',
            args: [groupId],
        });

        if (groupResult.rows[0]?.created_by !== creatorId) {
            throw new Error("Only the group creator can remove members.");
        }

        await db.execute({
            sql: 'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
            args: [groupId, memberUserId],
        });
    },

    /**
     * Get group details including members
     */
    async getGroupDetails(groupId: string): Promise<{ group: Group; members: Profile[] }> {
        const groupResult = await db.execute({
            sql: 'SELECT * FROM groups WHERE id = ?',
            args: [groupId],
        });

        const membersResult = await db.execute({
            sql: `
        SELECT p.* 
        FROM profiles p
        JOIN group_members gm ON gm.user_id = p.id
        WHERE gm.group_id = ?
      `,
            args: [groupId],
        });

        return {
            group: groupResult.rows[0] as unknown as Group,
            members: membersResult.rows as unknown as Profile[],
        };
    }
};
