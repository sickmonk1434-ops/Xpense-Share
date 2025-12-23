import { db } from '../utils/db';

export interface Expense {
    id: string;
    group_id: string | null;
    description: string;
    amount: number;
    payer_id: string;
    created_at: string;
    created_by: string;
}

export interface ExpenseSplit {
    id: string;
    expense_id: string;
    user_id: string;
    amount_owed: number;
}

export const expenseService = {
    /**
     * Add a new expense and automatically split it among all members of the group
     */
    async createExpense(
        groupId: string,
        description: string,
        amount: number,
        payerId: string,
        creatorId: string,
        splits: { userId: string; amountOwed: number }[]
    ): Promise<void> {
        if (splits.length === 0) throw new Error("At least one person must be involved in the expense.");

        // Validate that the total of splits equals the expense amount (handling floating point precision)
        const totalSplit = splits.reduce((sum, s) => sum + s.amountOwed, 0);
        if (Math.abs(totalSplit - amount) > 0.01) {
            throw new Error(`The split amounts ($${totalSplit.toFixed(2)}) do not match the total expense ($${amount.toFixed(2)}).`);
        }

        const expenseId = Math.random().toString(36).substring(2, 15);

        const statements = [
            {
                sql: 'INSERT INTO expenses (id, group_id, description, amount, payer_id, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                args: [expenseId, groupId, description, amount, payerId, creatorId],
            }
        ];

        for (const split of splits) {
            statements.push({
                sql: 'INSERT INTO expense_splits (expense_id, user_id, amount_owed) VALUES (?, ?, ?)',
                args: [expenseId, split.userId, split.amountOwed],
            });
        }

        await db.batch(statements, "write");
    },

    /**
     * Fetch recent expenses for a group
     */
    async getGroupExpenses(groupId: string): Promise<any[]> {
        const result = await db.execute({
            sql: `
        SELECT e.*, p.full_name as payer_name
        FROM expenses e
        JOIN profiles p ON p.id = e.payer_id
        WHERE e.group_id = ?
        ORDER BY e.created_at DESC
      `,
            args: [groupId],
        });
        return result.rows as any[];
    },

    /**
     * Get net balance for a user across all groups or a specific group.
     * Subtracts accepted settlements from the totals.
     */
    async getUserBalance(userId: string, groupId?: string): Promise<{ owed: number; owes: number }> {
        // 1. Amount user is owed from expenses
        const owedSql = groupId
            ? `SELECT SUM(s.amount_owed) as total FROM expense_splits s 
         JOIN expenses e ON e.id = s.expense_id 
         WHERE e.payer_id = ? AND s.user_id != ? AND e.group_id = ?`
            : `SELECT SUM(s.amount_owed) as total FROM expense_splits s 
         JOIN expenses e ON e.id = s.expense_id 
         WHERE e.payer_id = ? AND s.user_id != ?`;

        const owedArgs = groupId ? [userId, userId, groupId] : [userId, userId];
        const owedResult = await db.execute({ sql: owedSql, args: owedArgs });

        // 2. Amount user owes to others from expenses
        const owesSql = groupId
            ? `SELECT SUM(s.amount_owed) as total FROM expense_splits s
         JOIN expenses e ON e.id = s.expense_id
         WHERE s.user_id = ? AND e.payer_id != ? AND e.group_id = ?`
            : `SELECT SUM(s.amount_owed) as total FROM expense_splits s
         JOIN expenses e ON e.id = s.expense_id
         WHERE s.user_id = ? AND e.payer_id != ?`;

        const owesArgs = groupId ? [userId, userId, groupId] : [userId, userId];
        const owesResult = await db.execute({ sql: owesSql, args: owesArgs });

        // 3. Amount user has ALREADY PAID (Accepted settlements where user is sender)
        const sentSql = groupId
            ? `SELECT SUM(amount) as total FROM settlements WHERE sender_id = ? AND group_id = ? AND status = 'accepted'`
            : `SELECT SUM(amount) as total FROM settlements WHERE sender_id = ? AND status = 'accepted'`;

        const sentArgs = groupId ? [userId, groupId] : [userId];
        const sentResult = await db.execute({ sql: sentSql, args: sentArgs });

        // 4. Amount user has ALREADY RECEIVED (Accepted settlements where user is receiver)
        const receivedSql = groupId
            ? `SELECT SUM(amount) as total FROM settlements WHERE receiver_id = ? AND group_id = ? AND status = 'accepted'`
            : `SELECT SUM(amount) as total FROM settlements WHERE receiver_id = ? AND status = 'accepted'`;

        const receivedArgs = groupId ? [userId, groupId] : [userId];
        const receivedResult = await db.execute({ sql: receivedSql, args: receivedArgs });

        const rawOwed = (owedResult.rows[0]?.total as number) || 0;
        const rawOwes = (owesResult.rows[0]?.total as number) || 0;
        const sent = (sentResult.rows[0]?.total as number) || 0;
        const received = (receivedResult.rows[0]?.total as number) || 0;

        return {
            owed: Math.max(0, rawOwed - received),
            owes: Math.max(0, rawOwes - sent),
        };
    }
};
