import { db } from '../utils/db';
import { Group, Profile, GroupMember } from '../types/group';
import { emailService } from './email';
import { notificationService } from './notification';

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
     * Rename a group (Creator only)
     */
    async updateGroup(groupId: string, userId: string, name: string): Promise<void> {
        const groupResult = await db.execute({
            sql: 'SELECT created_by FROM groups WHERE id = ?',
            args: [groupId],
        });

        const group = groupResult.rows[0];
        if (!group || group.created_by !== userId) {
            throw new Error("Only the group creator can rename the group.");
        }

        await db.execute({
            sql: 'UPDATE groups SET name = ? WHERE id = ?',
            args: [name, groupId],
        });
    },

    /**
     * Add a member to a group (with member limit check)
     */
    async addMember(groupId: string, creatorId: string, newUserEmail: string): Promise<'added' | 'invited_registered' | 'invited_email'> {
        // 1. Check if the requester is the creator
        const groupResult = await db.execute({
            sql: 'SELECT name, created_by FROM groups WHERE id = ?',
            args: [groupId],
        });
        const group = groupResult.rows[0];
        if (!group || group.created_by !== (creatorId as any)) {
            throw new Error("Only the group creator can add members.");
        }

        // 2. Get inviter profile for the email/notification
        const inviterResult = await db.execute({
            sql: 'SELECT full_name FROM profiles WHERE id = ?',
            args: [creatorId],
        });
        const inviterName = (inviterResult.rows[0]?.full_name as string) || "The Group Creator";

        // 3. Get new user profile
        const userResult = await db.execute({
            sql: 'SELECT id FROM profiles WHERE email = ?',
            args: [newUserEmail],
        });
        const newUser = userResult.rows[0];

        // 4. If user found, check if already a member or already invited
        if (newUser) {
            const memberCheck = await db.execute({
                sql: 'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
                args: [groupId, newUser.id as string],
            });
            if (memberCheck.rows.length > 0) {
                throw new Error("This user is already a member of the group.");
            }

            const inviteCheck = await db.execute({
                sql: "SELECT id FROM invitations WHERE group_id = ? AND invitee_id = ? AND status = 'pending'",
                args: [groupId, newUser.id as string],
            });
            if (inviteCheck.rows.length > 0) {
                throw new Error("An invitation has already been sent to this user.");
            }
        }

        // 5. If user not found, send email invite
        if (!newUser) {
            await emailService.sendInvite(newUserEmail, group.name as string, inviterName);
            return 'invited_email';
        }

        // 6. Registered user: Create invitation and notification instead of direct add
        const invitationId = Math.random().toString(36).substring(2, 15);
        await db.execute({
            sql: 'INSERT INTO invitations (id, group_id, inviter_id, invitee_id) VALUES (?, ?, ?, ?)',
            args: [invitationId, groupId, creatorId, newUser.id as string],
        });

        await notificationService.createNotification(
            newUser.id as string,
            'invite',
            invitationId,
            `${inviterName} invited you to join "${group.name}".`
        );

        return 'invited_registered';
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
