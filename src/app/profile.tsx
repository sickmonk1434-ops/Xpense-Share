import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { profileService, UserProfile } from '../services/profile';
import { groupService } from '../services/group';
import { Button } from '../components/Button';
import { Crown, Package, Users, LogOut, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { router, Stack } from 'expo-router';

export default function ProfileScreen() {
    const { user } = useUser();
    const { signOut } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [groupCount, setGroupCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);

    const fetchData = async () => {
        if (!user) return;
        try {
            const [userProfile, groups] = await Promise.all([
                profileService.getUserProfile(user.id),
                groupService.getGroups(user.id)
            ]);
            setProfile(userProfile);
            setGroupCount(groups.length);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleUpgrade = async () => {
        if (!user) return;
        setUpgrading(true);
        try {
            // Simulate payment delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            await profileService.upgradeToPremium(user.id);
            Alert.alert("Success", "You are now a Pro member! Enjoy unlimited ads and higher limits.");
            fetchData();
        } catch (err: any) {
            Alert.alert("Error", err.message);
        } finally {
            setUpgrading(false);
        }
    };

    const handleSignOut = () => {
        Alert.alert("Sign Out", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Sign Out", style: "destructive", onPress: () => signOut() }
        ]);
    };

    if (loading || !profile) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    const isPremium = profile.subscription_tier === 'premium';

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Stack.Screen options={{ headerShown: false }} />

            <View className="px-6 pt-4 pb-2 flex-row items-center">
                <Pressable onPress={() => router.back()} className="p-2 -ml-2">
                    <ArrowLeft size={24} color="#0f172a" />
                </Pressable>
                <Text className="text-xl font-bold text-slate-900 ml-2">Account</Text>
            </View>

            <ScrollView className="flex-1 px-6">
                {/* User Info */}
                <View className="items-center py-8">
                    <View className="w-24 h-24 bg-slate-100 rounded-full items-center justify-center mb-4 border-4 border-slate-50 shadow-sm">
                        <Text className="text-3xl font-bold text-slate-400">{user?.fullName?.charAt(0) || user?.primaryEmailAddress?.emailAddress.charAt(0)}</Text>
                    </View>
                    <Text className="text-2xl font-black text-slate-900">{user?.fullName || 'User'}</Text>
                    <Text className="text-slate-500">{user?.primaryEmailAddress?.emailAddress}</Text>

                    <View className={`mt-4 px-4 py-1.5 rounded-full flex-row items-center ${isPremium ? 'bg-amber-100' : 'bg-slate-100'}`}>
                        {isPremium ? <Crown size={14} color="#b45309" /> : <Package size={14} color="#64748b" />}
                        <Text className={`text-xs font-bold ml-1.5 uppercase tracking-widest ${isPremium ? 'text-amber-800' : 'text-slate-600'}`}>
                            {profile.subscription_tier} Plan
                        </Text>
                    </View>
                </View>

                {/* Usage Stats */}
                <View className="bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100">
                    <Text className="text-lg font-bold text-slate-900 mb-6">Current Usage</Text>

                    <View className="mb-6">
                        <View className="flex-row justify-between mb-2">
                            <View className="flex-row items-center">
                                <Package size={18} color="#64748b" />
                                <Text className="font-bold text-slate-700 ml-2">Groups Created</Text>
                            </View>
                            <Text className="text-slate-900 font-black">{groupCount} <Text className="text-slate-400 font-bold">/ {profile.max_groups}</Text></Text>
                        </View>
                        <View className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <View
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min((groupCount / profile.max_groups) * 100, 100)}%` }}
                            />
                        </View>
                    </View>

                    <View>
                        <View className="flex-row justify-between mb-2">
                            <View className="flex-row items-center">
                                <Users size={18} color="#64748b" />
                                <Text className="font-bold text-slate-700 ml-2">Max Members/Group</Text>
                            </View>
                            <Text className="text-slate-900 font-black">{profile.max_members_per_group}</Text>
                        </View>
                    </View>
                </View>

                {/* Upgrade Card */}
                {!isPremium && (
                    <View className="bg-emerald-900 rounded-3xl p-6 mb-8 shadow-xl shadow-emerald-200">
                        <View className="flex-row justify-between items-start mb-4">
                            <View className="bg-emerald-800 p-3 rounded-2xl">
                                <Crown size={24} color="#fbbf24" />
                            </View>
                            <View className="bg-emerald-800/50 px-3 py-1 rounded-full">
                                <Text className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest">Best Value</Text>
                            </View>
                        </View>
                        <Text className="text-white text-xl font-bold mb-2">Upgrade to Pro</Text>
                        <View className="gap-2 mb-6">
                            <View className="flex-row items-center">
                                <CheckCircle2 size={14} color="#10b981" />
                                <Text className="text-emerald-100 text-sm ml-2">Up to 50 groups</Text>
                            </View>
                            <View className="flex-row items-center">
                                <CheckCircle2 size={14} color="#10b981" />
                                <Text className="text-emerald-100 text-sm ml-2">99 members per group</Text>
                            </View>
                            <View className="flex-row items-center">
                                <CheckCircle2 size={14} color="#10b981" />
                                <Text className="text-emerald-100 text-sm ml-2">Zero advertisements</Text>
                            </View>
                        </View>
                        <Button
                            label={upgrading ? "Processing..." : "Upgrade Now - $4.99/mo"}
                            onPress={handleUpgrade}
                            disabled={upgrading}
                        />
                    </View>
                )}

                <View className="mb-10">
                    <Pressable
                        onPress={handleSignOut}
                        className="flex-row items-center justify-center p-4 bg-rose-50 rounded-2xl border border-rose-100"
                    >
                        <LogOut size={20} color="#ef4444" />
                        <Text className="text-rose-600 font-bold ml-2">Sign Out</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
