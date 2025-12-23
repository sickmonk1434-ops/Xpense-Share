import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, Alert, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { settlementService } from '../services/settlement';
import { groupService } from '../services/group';
import { useUser } from '@clerk/clerk-expo';
import { router, useLocalSearchParams } from 'expo-router';
import { DollarSign, User, ArrowRight } from 'lucide-react-native';
import { Group, Profile } from '../types/group';

export default function SettleUp() {
    const { user } = useUser();
    const { groupId } = useLocalSearchParams<{ groupId: string }>();

    const [members, setMembers] = useState<Profile[]>([]);
    const [receiverId, setReceiverId] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!groupId || !user) return;
            try {
                const details = await groupService.getGroupDetails(groupId);
                // Exclude current user from potential receivers
                const others = details.members.filter(m => m.id !== user.id);
                setMembers(others);
                if (others.length > 0) setReceiverId(others[0].id);
            } catch (err) {
                console.error(err);
            } finally {
                setFetchingData(false);
            }
        };
        fetchData();
    }, [groupId, user]);

    const handleSettle = async () => {
        if (!amount || parseFloat(amount) <= 0 || !receiverId || !groupId || !user) {
            Alert.alert("Error", "Please select a member and enter a valid amount.");
            return;
        }

        setLoading(true);
        try {
            await settlementService.createSettlement(
                groupId,
                user.id,
                receiverId,
                parseFloat(amount)
            );
            Alert.alert(
                "Request Sent",
                "Your payment record has been submitted and is pending approval from the group creator.",
                [{ text: "OK", onPress: () => router.back() }]
            );
        } catch (err: any) {
            Alert.alert("Error", err.message || "Could not submit settlement.");
        } finally {
            setLoading(false);
        }
    };

    if (fetchingData) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1 px-6 pt-6">
                <View className="mb-8">
                    <Text className="text-3xl font-bold text-slate-900 mb-2">Settle Up</Text>
                    <Text className="text-slate-500 text-base">Record a payment you made to someone else.</Text>
                </View>

                <View className="gap-6">
                    <View>
                        <Text className="mb-4 font-bold text-slate-900">Choose who you paid</Text>
                        {members.map(member => (
                            <Pressable
                                key={member.id}
                                onPress={() => setReceiverId(member.id)}
                                className={`flex-row items-center justify-between p-4 mb-3 rounded-2xl border ${receiverId === member.id ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-100'}`}
                            >
                                <View className="flex-row items-center">
                                    <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3 border border-slate-200">
                                        <Text className="font-bold text-slate-700">{member.full_name?.charAt(0)}</Text>
                                    </View>
                                    <Text className={`font-bold ${receiverId === member.id ? 'text-emerald-900' : 'text-slate-700'}`}>
                                        {member.full_name}
                                    </Text>
                                </View>
                                {receiverId === member.id && (
                                    <View className="w-6 h-6 bg-emerald-500 rounded-full items-center justify-center">
                                        <DollarSign size={14} color="white" />
                                    </View>
                                )}
                            </Pressable>
                        ))}
                    </View>

                    <View>
                        <Text className="mb-2 font-medium text-slate-700">Amount Paid</Text>
                        <View className="flex-row items-center border border-slate-300 rounded-xl bg-slate-50 px-4">
                            <DollarSign size={20} color="#64748b" />
                            <TextInput
                                placeholder="0.00"
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                                className="flex-1 py-4 ml-3 text-lg font-bold text-slate-900"
                            />
                        </View>
                    </View>

                    <View className="mt-6">
                        <Button
                            label={loading ? "Submitting..." : "Submit for Approval"}
                            onPress={handleSettle}
                            disabled={loading}
                            icon={<ArrowRight size={20} color="white" />}
                        />
                        <Button
                            label="Cancel"
                            variant="secondary"
                            className="mt-3"
                            onPress={() => router.back()}
                            disabled={loading}
                        />
                    </View>

                    <View className="bg-amber-50 p-4 rounded-xl border border-amber-100 mt-4">
                        <Text className="text-amber-800 text-xs leading-relaxed">
                            Note: Settlements will only be removed from your debt balance after the group creator accepts the request.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
