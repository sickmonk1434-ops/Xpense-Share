import { db } from '../utils/db';

export type NotificationType = 'invite' | 'expense';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    reference_id: string;
    message: string;
    is_read: number;
    read_at: string | null;
    created_at: string;
}

export const notificationService = {
    /**
     * Fetch active notifications for a user and perform cleanup
     */
    async getNotifications(userId: string): Promise<Notification[]> {
        // 1. Auto-cleanup: Delete read notifications older than 2 days
        await db.execute({
            sql: `
                DELETE FROM notifications 
                WHERE user_id = ? 
                AND is_read = 1 
                AND read_at < datetime('now', '-2 days')
            `,
            args: [userId],
        });

        // 2. Fetch all current notifications
        const result = await db.execute({
            sql: 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
            args: [userId],
        });

        return result.rows as unknown as Notification[];
    },

    /**
     * Mark a notification as read
     */
    async markAsRead(notificationId: string): Promise<void> {
        await db.execute({
            sql: `
                UPDATE notifications 
                SET is_read = 1, read_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `,
            args: [notificationId],
        });
    },

    /**
     * Delete a notification (manual swipe/remove)
     */
    async deleteNotification(notificationId: string): Promise<void> {
        await db.execute({
            sql: 'DELETE FROM notifications WHERE id = ?',
            args: [notificationId],
        });
    },

    /**
     * Handle group invitation (Accept or Reject)
     */
    async handleInvitation(invitationId: string, userId: string, status: 'accepted' | 'rejected'): Promise<void> {
        // 1. Get invitation details
        const inviteResult = await db.execute({
            sql: 'SELECT * FROM invitations WHERE id = ? AND invitee_id = ?',
            args: [invitationId, userId],
        });
        const invite = inviteResult.rows[0];
        if (!invite) throw new Error("Invitation not found.");

        if (status === 'accepted') {
            // 2. Add to group members
            await db.execute({
                sql: 'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
                args: [invite.group_id as string, userId],
            });
        }

        // 3. Update invitation status
        await db.execute({
            sql: 'UPDATE invitations SET status = ? WHERE id = ?',
            args: [status, invitationId],
        });

        // 4. Also delete the associated notification
        await db.execute({
            sql: "DELETE FROM notifications WHERE user_id = ? AND type = 'invite' AND reference_id = ?",
            args: [userId, invitationId],
        });
    },

    /**
     * Helper to create a notification
     */
    async createNotification(userId: string, type: NotificationType, referenceId: string, message: string): Promise<void> {
        await db.execute({
            sql: `
                INSERT INTO notifications (user_id, type, reference_id, message) 
                VALUES (?, ?, ?, ?)
            `,
            args: [userId, type, referenceId, message],
        });
    }
};
