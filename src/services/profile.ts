import { db } from '../utils/db';

export type SubscriptionTier = 'free' | 'premium';

export interface UserProfile {
    id: string;
    email: string | null;
    full_name: string | null;
    subscription_tier: SubscriptionTier;
    max_groups: number;
    max_members_per_group: number;
}

export const profileService = {
    /**
     * Fetch the user's profile and current limits
     */
    async getUserProfile(userId: string): Promise<UserProfile | null> {
        const result = await db.execute({
            sql: 'SELECT * FROM profiles WHERE id = ?',
            args: [userId],
        });

        if (result.rows.length === 0) return null;

        return result.rows[0] as unknown as UserProfile;
    },

    /**
     * Upgrade user to premium (Simulated)
     */
    async upgradeToPremium(userId: string): Promise<void> {
        await db.execute({
            sql: `UPDATE profiles 
            SET subscription_tier = 'premium', 
                max_groups = 50, 
                max_members_per_group = 99 
            WHERE id = ?`,
            args: [userId],
        });
    },

    /**
     * Downgrade user to free (Simulated/For testing)
     */
    async downgradeToFree(userId: string): Promise<void> {
        await db.execute({
            sql: `UPDATE profiles 
            SET subscription_tier = 'free', 
                max_groups = 10, 
                max_members_per_group = 15 
            WHERE id = ?`,
            args: [userId],
        });
    }
};
