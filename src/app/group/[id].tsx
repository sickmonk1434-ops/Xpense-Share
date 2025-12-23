import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { groupService } from '../../services/group';
import { expenseService } from '../../services/expense';
import { settlementService } from '../../services/settlement';
import { Group, Profile } from '../../types/group';
import { useUser } from '@clerk/clerk-expo';
import { Button } from '../../components/Button';
import { Trash2, UserMinus, UserPlus, ArrowLeft, Plus, Check, X, Clock } from 'lucide-react-native';

export default function GroupDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useUser();
    const [data, setData] = useState<{ group: Group; members: Profile[] } | null>(null);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [settlements, setSettlements] = useState<any[]>([]);
    const [balance, setBalance] = useState({ owed: 0, owes: 0 });
    const [loading, setLoading] = useState(true);

    const fetchDetails = useCallback(async () => {
        if (!id || !user) return;
        try {
            const [details, groupExpenses, userBalance, groupSettlements] = await Promise.all([
                groupService.getGroupDetails(id),
                expenseService.getGroupExpenses(id),
                expenseService.getUserBalance(user.id, id),
                settlementService.getGroupSettlements(id)
            ]);
            setData(details);
            setExpenses(groupExpenses);
            setBalance(userBalance);
            setSettlements(groupSettlements);
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Could not fetch group details.");
        } finally {
            setLoading(false);
        }
    }, [id, user]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    const handleUpdateSettlement = async (settlementId: string, status: 'accepted' | 'rejected') => {
        try {
            await settlementService.updateStatus(settlementId, status);
            fetchDetails();
        } catch (err: any) {
            Alert.alert("Error", err.message);
        }
    };

    const handleDeleteGroup = async () => {
        if (!id || !user) return;
        Alert.alert(
            "Delete Group",
            "Are you sure you want to delete this group? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await groupService.deleteGroup(id, user.id);
                            router.replace('/');
                        } catch (err: any) {
                            Alert.alert("Error", err.message);
                        }
                    }
                }
            ]
        );
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!id || !user) return;
        try {
            await groupService.removeMember(id, user.id, memberId);
            fetchDetails();
        } catch (err: any) {
            Alert.alert("Error", err.message);
        }
    };

    if (loading || !data) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    const isCreator = data.group.created_by === user?.id;
    const netBalance = balance.owed - balance.owes;
    const pendingSettlements = settlements.filter(s => s.status === 'pending');

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: data.group.name,
                    headerLeft: () => (
                        <Pressable onPress={() => router.back()} className="ml-4">
                            <ArrowLeft size={24} color="#0f172a" />
                        </Pressable>
                    ),
                    headerRight: () => (
                        <Pressable
                            onPress={() => router.push({ pathname: '/add-expense', params: { groupId: id } })}
                            className="mr-4"
                        >
                            <Plus size={24} color="#10b981" />
                        </Pressable>
                    )
                }}
            />
            <ScrollView className="flex-1 px-6 pt-4">
                {/* Balance Card */}
                <View className="bg-slate-900 rounded-3xl p-6 mb-8 shadow-xl">
                    <Text className="text-slate-400 font-medium mb-1">Your group balance</Text>
                    <Text className={`text-4xl font-black ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {netBalance >= 0 ? `+ $${netBalance.toFixed(2)}` : `- $${Math.abs(netBalance).toFixed(2)}`}
                    </Text>
                    <View className="flex-row items-center justify-between mt-4">
                        <View className="flex-row items-center">
                            <View>
                                <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Owed</Text>
                                <Text className="text-emerald-400 font-bold">$ {balance.owed.toFixed(2)}</Text>
                            </View>
                            <View className="ml-8">
                                <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Owes</Text>
                                <Text className="text-rose-400 font-bold">$ {balance.owes.toFixed(2)}</Text>
                            </View>
                        </View>
                        {!isCreator && netBalance < 0 && (
                            <Button
                                label="Settle Up"
                                size="sm"
                                className="rounded-full px-4 h-10"
                                onPress={() => router.push({ pathname: '/settle-up', params: { groupId: id } })}
                            />
                        )}
                    </View>
                </View>

                {/* Pending Settlements (Creator ONLY) */}
                {isCreator && pendingSettlements.length > 0 && (
                    <View className="mb-8 bg-amber-50 rounded-2xl p-4 border border-amber-100">
                        <Text className="text-amber-900 font-bold mb-3 flex-row items-center">
                            <Clock size={16} color="#92400e" className="mr-2" /> Pending Approvals ({pendingSettlements.length})
                        </Text>
                        {pendingSettlements.map((s) => (
                            <View key={s.id} className="flex-row justify-between items-center bg-white p-3 rounded-xl mb-2 shadow-sm">
                                <View className="flex-1">
                                    <Text className="text-sm font-bold text-slate-900">{s.sender_name} paid {s.receiver_name}</Text>
                                    <Text className="text-lg font-black text-emerald-600">$ {s.amount.toFixed(2)}</Text>
                                </View>
                                <View className="flex-row gap-2">
                                    <Pressable
                                        onPress={() => handleUpdateSettlement(s.id, 'accepted')}
                                        className="w-10 h-10 bg-emerald-100 rounded-full items-center justify-center"
                                    >
                                        <Check size={20} color="#059669" />
                                    </Pressable>
                                    <Pressable
                                        onPress={() => handleUpdateSettlement(s.id, 'rejected')}
                                        className="w-10 h-10 bg-rose-100 rounded-full items-center justify-center"
                                    >
                                        <X size={20} color="#dc2626" />
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <View className="mb-8">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-lg font-bold text-slate-900">Members ({data.members.length})</Text>
                        {isCreator && (
                            <Pressable onPress={() => Alert.alert("Coming Soon", "Add member by email feature.")}>
                                <View className="flex-row items-center">
                                    <UserPlus size={18} color="#10b981" />
                                    <Text className="text-emerald-600 font-bold ml-1">Add</Text>
                                </View>
                            </Pressable>
                        )}
                    </View>
                    <View className="bg-slate-50 rounded-2xl p-4">
                        {data.members.map((member) => (
                            <View key={member.id} className="flex-row justify-between items-center py-3 border-b border-slate-200 last:border-0">
                                <View className="flex-row items-center">
                                    <View className="w-10 h-10 bg-white border border-slate-200 rounded-full items-center justify-center mr-3">
                                        <Text className="text-slate-700 font-bold">{member.full_name?.charAt(0)}</Text>
                                    </View>
                                    <View>
                                        <Text className="font-bold text-slate-900">{member.full_name}</Text>
                                        <Text className="text-[10px] text-slate-500">{member.email}</Text>
                                    </View>
                                </View>
                                <View className="flex-row items-center">
                                    {member.id === data.group.created_by && (
                                        <Text className="text-[8px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full mr-2">ADMIN</Text>
                                    )}
                                    {isCreator && member.id !== user?.id && (
                                        <Pressable onPress={() => handleRemoveMember(member.id)} className="p-1">
                                            <UserMinus size={16} color="#ef4444" />
                                        </Pressable>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                <View className="mb-20">
                    <Text className="text-lg font-bold text-slate-900 mb-4">Activity</Text>
                    {expenses.length === 0 && settlements.filter(s => s.status === 'accepted').length === 0 ? (
                        <View className="items-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <Text className="text-slate-400">No activity yet.</Text>
                        </View>
                    ) : (
                        <View>
                            {expenses.map((expense) => (
                                <View key={`ex-${expense.id}`} className="bg-white border border-slate-100 rounded-2xl p-4 mb-3 flex-row justify-between items-center shadow-sm">
                                    <View className="flex-1">
                                        <Text className="font-bold text-slate-900 text-base">{expense.description}</Text>
                                        <Text className="text-slate-500 text-xs">Paid by {expense.payer_id === user?.id ? 'You' : expense.payer_name}</Text>
                                    </View>
                                    <Text className="text-lg font-black text-slate-900">$ {expense.amount.toFixed(2)}</Text>
                                </View>
                            ))}
                            {settlements.filter(s => s.status === 'accepted').map((s) => (
                                <View key={`settle-${s.id}`} className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-3 flex-row justify-between items-center">
                                    <View className="flex-1">
                                        <Text className="font-bold text-emerald-900 text-base">Payment Settled</Text>
                                        <Text className="text-emerald-700 text-xs">{s.sender_name} → {s.receiver_name}</Text>
                                    </View>
                                    <Text className="text-lg font-black text-emerald-700">$ {s.amount.toFixed(2)}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
