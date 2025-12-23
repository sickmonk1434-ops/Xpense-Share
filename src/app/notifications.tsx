import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { notificationService, Notification } from '../services/notification';
import { Bell, ArrowLeft, Check, X, Trash2, Mail } from 'lucide-react-native';

export default function Notifications() {
    const { user } = useUser();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const data = await notificationService.getNotifications(user.id);
            setNotifications(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const handleAction = async (notification: Notification, action: 'accept' | 'reject') => {
        if (!user) return;
        try {
            if (notification.type === 'invite') {
                await notificationService.handleInvitation(notification.reference_id, user.id, action === 'accept' ? 'accepted' : 'rejected');
                Alert.alert("Success", action === 'accept' ? "Joined the group!" : "Invitation declined.");
            }
            fetchNotifications();
        } catch (err: any) {
            Alert.alert("Error", err.message);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await notificationService.markAsRead(id);
            fetchNotifications();
        } catch (err) {
            console.error(err);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await notificationService.deleteNotification(id);
            fetchNotifications();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <Stack.Screen options={{ title: 'Notifications', headerShown: false }} />

            {/* Header */}
            <View className="bg-white px-6 py-4 flex-row items-center border-b border-slate-100">
                <Pressable onPress={() => router.back()} className="mr-4">
                    <ArrowLeft size={24} color="#0f172a" />
                </Pressable>
                <Text className="text-xl font-bold text-slate-900">Notifications</Text>
            </View>

            <ScrollView
                className="flex-1"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} />}
            >
                {notifications.length === 0 ? (
                    <View className="flex-1 items-center justify-center pt-20 px-10">
                        <View className="bg-slate-100 p-6 rounded-full mb-4">
                            <Bell size={40} color="#94a3b8" />
                        </View>
                        <Text className="text-slate-900 font-bold text-lg mb-2">No notifications</Text>
                        <Text className="text-slate-500 text-center">You're all caught up! Group invites and activity will show up here.</Text>
                    </View>
                ) : (
                    <View className="p-4 gap-4">
                        {notifications.map((item) => (
                            <Pressable
                                key={item.id}
                                onPress={() => !item.is_read && markAsRead(item.id)}
                                className={`bg-white p-4 rounded-2xl border ${item.is_read ? 'border-slate-100 opacity-80' : 'border-emerald-100'} shadow-sm`}
                            >
                                <View className="flex-row items-start">
                                    <View className={`p-2 rounded-full mr-3 ${item.type === 'invite' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                                        {item.type === 'invite' ? <Mail size={18} color="#d97706" /> : <Bell size={18} color="#10b981" />}
                                    </View>
                                    <View className="flex-1">
                                        <View className="flex-row justify-between items-center mb-1">
                                            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                {item.type === 'invite' ? 'Group Invitation' : 'New Activity'}
                                            </Text>
                                            <Text className="text-[10px] text-slate-400">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <Text className={`text-slate-900 text-base ${!item.is_read ? 'font-bold' : ''}`}>
                                            {item.message}
                                        </Text>

                                        {item.type === 'invite' && (
                                            <View className="flex-row gap-3 mt-4">
                                                <Pressable
                                                    onPress={() => handleAction(item, 'accept')}
                                                    className="flex-1 bg-emerald-500 py-2 rounded-xl items-center justify-center"
                                                >
                                                    <View className="flex-row items-center">
                                                        <Check size={16} color="white" className="mr-1" />
                                                        <Text className="text-white font-bold">Accept</Text>
                                                    </View>
                                                </Pressable>
                                                <Pressable
                                                    onPress={() => handleAction(item, 'reject')}
                                                    className="flex-1 bg-slate-100 py-2 rounded-xl items-center justify-center"
                                                >
                                                    <View className="flex-row items-center">
                                                        <X size={16} color="#64748b" className="mr-1" />
                                                        <Text className="text-slate-600 font-bold">Ignore</Text>
                                                    </View>
                                                </Pressable>
                                            </View>
                                        )}
                                    </View>

                                    <Pressable onPress={() => deleteNotification(item.id)} className="ml-2">
                                        <Trash2 size={16} color="#cbd5e1" />
                                    </Pressable>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
