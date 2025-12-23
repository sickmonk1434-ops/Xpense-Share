import { db } from '../utils/db';

export interface Settlement {
    id: string;
    group_id: string;
    sender_id: string;
    receiver_id: string;
    amount: number;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
}

export const settlementService = {
    /**
     * Create a new settlement request (pending by default)
     */
    async createSettlement(
        groupId: string,
        senderId: string,
        receiverId: string,
        amount: number
    ): Promise<void> {
        await db.execute({
            sql: 'INSERT INTO settlements (group_id, sender_id, receiver_id, amount, status) VALUES (?, ?, ?, ?, ?)',
            args: [groupId, senderId, receiverId, amount, 'pending'],
        });
    },

    /**
     * Update settlement status (Restricted to group creator in UI/Service logic)
     */
    async updateStatus(
        settlementId: string,
        status: 'accepted' | 'rejected'
    ): Promise<void> {
        await db.execute({
            sql: 'UPDATE settlements SET status = ? WHERE id = ?',
            args: [status, settlementId],
        });
    },

    /**
     * Fetch all settlements for a group
     */
    async getGroupSettlements(groupId: string): Promise<any[]> {
        const result = await db.execute({
            sql: `
        SELECT s.*, 
               p1.full_name as sender_name, 
               p2.full_name as receiver_name
        FROM settlements s
        JOIN profiles p1 ON p1.id = s.sender_id
        JOIN profiles p2 ON p2.id = s.receiver_id
        WHERE s.group_id = ?
        ORDER BY s.created_at DESC
      `,
            args: [groupId],
        });
        return result.rows;
    },

    /**
     * Calculate exact debts between members, taking only 'accepted' settlements into account
     */
    async getNetDebts(groupId: string): Promise<any[]> {
        // This is a simplified version. In a real app, we'd calculate net balances for all pairs.
        // For now, let's just return the aggregate per member for the UI.
        const result = await db.execute({
            sql: `
        SELECT p.id, p.full_name,
               (SELECT COALESCE(SUM(amount_owed), 0) FROM expense_splits es 
                JOIN expenses e ON e.id = es.expense_id 
                WHERE es.user_id = p.id AND e.group_id = ?) as total_owes,
               (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e 
                WHERE e.payer_id = p.id AND e.group_id = ?) as total_paid,
               (SELECT COALESCE(SUM(s.amount), 0) FROM settlements s 
                WHERE s.sender_id = p.id AND s.group_id = ? AND s.status = 'accepted') as sent_payments,
               (SELECT COALESCE(SUM(s.amount), 0) FROM settlements s 
                WHERE s.receiver_id = p.id AND s.group_id = ? AND s.status = 'accepted') as received_payments
        FROM profiles p
        JOIN group_members gm ON gm.user_id = p.id
        WHERE gm.group_id = ?
      `,
            args: [groupId, groupId, groupId, groupId, groupId],
        });
        return result.rows;
    }
};
