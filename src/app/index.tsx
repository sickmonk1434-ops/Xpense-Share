import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View, ScrollView, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { GroupCard } from '../components/GroupCard';
import { router, Stack } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { groupService } from '../services/group';
import { expenseService } from '../services/expense';
import { Group } from '../types/group';
import { db } from '../utils/db';
import { User, Plus, Bell } from 'lucide-react-native';
import { notificationService } from '../services/notification';

export default function Home() {
    const { isLoaded, isSignedIn, user } = useUser();
    const { signOut } = useAuth();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [netBalance, setNetBalance] = useState({ totalOwed: 0, totalOwes: 0 });
    const [unreadCount, setUnreadCount] = useState(0);

    const syncProfileAndFetchGroups = async () => {
        if (!user) return;

        try {
            // 1. Upsert profile
            await db.execute({
                sql: `
                    INSERT INTO profiles (id, email, full_name, avatar_url)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                    email = excluded.email,
                    full_name = excluded.full_name,
                    avatar_url = excluded.avatar_url,
                    updated_at = CURRENT_TIMESTAMP
                `,
                args: [
                    user.id,
                    user.primaryEmailAddress?.emailAddress || null,
                    user.fullName || null,
                    user.imageUrl || null
                ],
            });

            // 2. Fetch groups, balances, and notifications
            const [userGroups, balances, notifications] = await Promise.all([
                groupService.getGroups(user.id),
                expenseService.getUserBalance(user.id),
                notificationService.getNotifications(user.id)
            ]);
            setGroups(userGroups);
            setNetBalance({ totalOwed: balances.owed, totalOwes: balances.owes });
            setUnreadCount(notifications.filter(n => !n.is_read).length);
        } catch (err) {
            console.error("Dashboard error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        syncProfileAndFetchGroups();
    }, [user]);

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.replace('/(auth)/login');
        } else if (isSignedIn) {
            syncProfileAndFetchGroups();
        }
    }, [isLoaded, isSignedIn]);

    const totalBalance = netBalance.totalOwed - netBalance.totalOwes;

    if (!isLoaded || loading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: () => (
                        <View className="flex-row items-center gap-2">
                            <Image
                                source={require('../../assets/logo.jpg')}
                                style={{ width: 30, height: 30 }}
                                resizeMode="contain"
                            />
                            <Text className="text-lg font-bold text-slate-900">Xpense Share</Text>
                        </View>
                    ),
                    headerTitleAlign: 'left',
                    headerRight: () => (
                        <View className="flex-row items-center mr-4">
                            <Pressable
                                onPress={() => router.push('/notifications')}
                                className="mr-3 p-2 bg-slate-100 rounded-full relative"
                            >
                                <Bell size={20} color="#0f172a" />
                                {unreadCount > 0 && (
                                    <View className="absolute top-0 right-0 h-4 w-4 bg-rose-500 rounded-full items-center justify-center border-2 border-white">
                                        <Text className="text-[8px] text-white font-bold">{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                    </View>
                                )}
                            </Pressable>
                            <Pressable onPress={() => router.push('/profile')} className="p-2 bg-slate-100 rounded-full">
                                <User size={20} color="#0f172a" />
                            </Pressable>
                        </View>
                    )
                }}
            />
            <ScrollView
                className="flex-1 px-6 pt-6"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} />
                }
            >
                <View className="bg-slate-900 rounded-3xl p-6 mb-8 shadow-xl">
                    <Text className="text-slate-400 font-medium mb-1">Your total balance</Text>
                    <Text className={`text-4xl font-black ${totalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {totalBalance >= 0 ? `+ $${totalBalance.toFixed(2)}` : `- $${Math.abs(totalBalance).toFixed(2)}`}
                    </Text>
                    <View className="flex-row items-center mt-4">
                        <View>
                            <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Owed</Text>
                            <Text className="text-emerald-400 font-bold">$ {netBalance.totalOwed.toFixed(2)}</Text>
                        </View>
                        <View className="ml-8">
                            <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Owes</Text>
                            <Text className="text-rose-400 font-bold">$ {netBalance.totalOwes.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                <View className="flex-row gap-4 mb-8">
                    <Button
                        label="New Group"
                        onPress={() => router.push('/create-group')}
                        className="flex-1"
                        icon={<Plus size={20} color="white" />}
                    />
                    <Button
                        label="Profile"
                        onPress={() => router.push('/profile')}
                        variant="secondary"
                        className="flex-1"
                        icon={<User size={20} color="#10b981" />}
                    />
                </View>

                <Text className="text-xl font-bold text-slate-900 mb-4">Your Groups</Text>

                {groups.length === 0 ? (
                    <View className="items-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <Text className="text-slate-400 text-base mb-4">No groups yet.</Text>
                        <Button
                            label="Create your first group"
                            variant="secondary"
                            className="px-6"
                            onPress={() => router.push('/create-group')}
                        />
                    </View>
                ) : (
                    groups.map(group => (
                        <GroupCard
                            key={group.id}
                            group={group}
                            onPress={(id) => router.push(`/group/${id}`)}
                        />
                    ))
                )}

                <View className="h-20" />
            </ScrollView>
        </SafeAreaView>
    );
}
