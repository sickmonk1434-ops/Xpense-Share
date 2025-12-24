import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View, ScrollView, ActivityIndicator, Pressable, RefreshControl, Image as RNImage } from 'react-native';
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
    const [notifications, setNotifications] = useState<any[]>([]); // Store full notifications

    // Dropdown states
    const [showProfile, setShowProfile] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const syncProfileAndFetchGroups = async () => {
        if (!user) return;

        // 1. Upsert profile (fail silently if error)
        try {
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
        } catch (upsertErr) {
            console.error("Profile sync failed, but proceeding:", upsertErr);
        }

        // 2. Fetch all data (Groups should load independently)
        const [userGroups, balances, notifs] = await Promise.all([
            groupService.getGroups(user.id),
            expenseService.getUserBalance(user.id),
            notificationService.getNotifications(user.id)
        ]);
        setGroups(userGroups);
        setNetBalance({ totalOwed: balances.owed, totalOwes: balances.owes });
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch (err) {
        console.error("Dashboard error:", err);
    } finally {
        setLoading(false);
        setRefreshing(false);
    }

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

    // Handle Invite Actions
    const handleInviteAction = async (notification: any, action: 'accept' | 'reject') => {
        if (!user) return;
        try {
            await notificationService.handleInvitation(notification.reference_id, user.id, action === 'accept' ? 'accepted' : 'rejected');
            alert(action === 'accept' ? "Joined!" : "Ignored.");
            syncProfileAndFetchGroups(); // Refresh data
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Mark read
    const markAsRead = async (id: string) => {
        await notificationService.markAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const totalBalance = netBalance.totalOwed - netBalance.totalOwes;

    if (!isLoaded || loading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white relative">
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: () => (
                        <View className="flex-row items-center gap-2">
                            <RNImage
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
                                onPress={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
                                className={`mr-3 p-2 rounded-full relative ${showNotifications ? 'bg-emerald-100' : 'bg-slate-100'}`}
                            >
                                <Bell size={20} color={showNotifications ? "#10b981" : "#0f172a"} />
                                {unreadCount > 0 && (
                                    <View className="absolute top-0 right-0 h-4 w-4 bg-rose-500 rounded-full items-center justify-center border-2 border-white">
                                        <Text className="text-[8px] text-white font-bold">{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                    </View>
                                )}
                            </Pressable>
                            <Pressable
                                onPress={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
                                className={`p-2 rounded-full ${showProfile ? 'bg-emerald-100' : 'bg-slate-100'}`}
                            >
                                <User size={20} color={showProfile ? "#10b981" : "#0f172a"} />
                            </Pressable>
                        </View>
                    )
                }}
            />

            {/* Main Content */}
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

                {/* Only New Group Button now */}
                <View className="mb-8">
                    <Button
                        label="New Group"
                        onPress={() => router.push('/create-group')}
                        className="w-full"
                        icon={<Plus size={20} color="white" />}
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

            {/* Profile Dropdown */}
            {showProfile && (
                <View className="absolute top-0 right-4 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50">
                    <View className="items-center mb-4 border-b border-slate-100 pb-4">
                        <RNImage source={{ uri: user?.imageUrl }} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 8 }} />
                        <Text className="text-lg font-bold text-slate-900">{user?.fullName}</Text>
                        <Text className="text-xs text-slate-500">{user?.primaryEmailAddress?.emailAddress}</Text>
                    </View>
                    <View className="mb-4">
                        <Text className="text-xs font-bold text-slate-400 uppercase mb-2">Details</Text>
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-slate-600">Plan</Text>
                            <Text className="font-bold text-emerald-600">Free</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-slate-600">Groups</Text>
                            <Text className="font-bold text-slate-900">{groups.length}</Text>
                        </View>
                    </View>
                    <Button label="Sign Out" variant="secondary" onPress={() => signOut()} />
                </View>
            )}

            {/* Notifications Dropdown */}
            {showNotifications && (
                <View className="absolute top-0 right-16 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 max-h-96">
                    <Text className="text-lg font-bold text-slate-900 mb-4">Notifications</Text>
                    <ScrollView className="max-h-64">
                        {notifications.length === 0 ? (
                            <Text className="text-slate-400 text-center py-4">No new notifications</Text>
                        ) : (
                            notifications.map(n => (
                                <Pressable key={n.id} onPress={() => markAsRead(n.id)} className={`mb-3 p-3 rounded-xl border ${n.is_read ? 'bg-white border-slate-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                    <Text className="text-sm text-slate-900 font-medium mb-1">{n.message}</Text>
                                    <Text className="text-[10px] text-slate-400 mb-2">{new Date(n.created_at).toLocaleDateString()}</Text>
                                    {n.type === 'invite' && (
                                        <View className="flex-row gap-2">
                                            <Pressable onPress={() => handleInviteAction(n, 'accept')} className="bg-emerald-500 px-3 py-1 rounded-lg">
                                                <Text className="text-white text-xs font-bold">Accept</Text>
                                            </Pressable>
                                            <Pressable onPress={() => handleInviteAction(n, 'reject')} className="bg-slate-200 px-3 py-1 rounded-lg">
                                                <Text className="text-slate-600 text-xs font-bold">Ignore</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </Pressable>
                            ))
                        )}
                    </ScrollView>
                    <Pressable onPress={() => router.push('/notifications')} className="mt-2 border-t border-slate-100 pt-2">
                        <Text className="text-center text-emerald-600 font-bold text-sm">View All</Text>
                    </Pressable>
                </View>
            )}
        </SafeAreaView>
    );
}
