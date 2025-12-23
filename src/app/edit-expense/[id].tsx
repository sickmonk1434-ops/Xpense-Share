import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, Alert, ScrollView, ActivityIndicator, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { expenseService } from '../../services/expense';
import { groupService } from '../../services/group';
import { profileService, UserProfile } from '../../services/profile';
import { useUser } from '@clerk/clerk-expo';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { DollarSign, FileText, Users, Check, X, ArrowLeft } from 'lucide-react-native';
import { Group, Profile } from '../../types/group';
import { AdBanner } from '../../components/AdBanner';
import { db } from '../../utils/db';

export default function EditExpense() {
    const { user } = useUser();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [groupId, setGroupId] = useState('');
    const [members, setMembers] = useState<Profile[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
    const [isUnequal, setIsUnequal] = useState(false);
    const [manualAmounts, setManualAmounts] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);

    useEffect(() => {
        const fetchExpenseData = async () => {
            if (!user || !id) return;
            try {
                // 1. Fetch Expense Details
                const expenseResult = await db.execute({
                    sql: 'SELECT * FROM expenses WHERE id = ?',
                    args: [id]
                });
                const expense = expenseResult.rows[0];
                if (!expense) {
                    Alert.alert("Error", "Expense not found");
                    router.back();
                    return;
                }

                // 2. Fetch Splits
                const splitsResult = await db.execute({
                    sql: 'SELECT * FROM expense_splits WHERE expense_id = ?',
                    args: [id]
                });
                const splits = splitsResult.rows as any[];

                // 3. Set Initial State
                setDescription(expense.description as string);
                setAmount(expense.amount.toString());
                setGroupId(expense.group_id as string);

                // Check if it was unequal (if splits aren't roughly equal)
                const isUnequalSplit = splits.some((s, _, arr) =>
                    Math.abs(s.amount_owed - (expense.amount as number / arr.length)) > 0.05
                );
                setIsUnequal(isUnequalSplit);

                const manual: { [key: string]: string } = {};
                const selected = new Set<string>();
                splits.forEach(s => {
                    selected.add(s.user_id);
                    manual[s.user_id] = s.amount_owed.toString();
                });
                setSelectedMemberIds(selected);
                setManualAmounts(manual);

                // 4. Fetch Group Members and Profile
                const [details, profile] = await Promise.all([
                    groupService.getGroupDetails(expense.group_id as string),
                    profileService.getUserProfile(user.id)
                ]);
                setMembers(details.members);
                setUserProfile(profile);

            } catch (err) {
                console.error(err);
                Alert.alert("Error", "Could not load expense data.");
            } finally {
                setFetchingData(false);
            }
        };
        fetchExpenseData();
    }, [id, user]);

    const toggleMember = (id: string) => {
        const next = new Set(selectedMemberIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedMemberIds(next);
    };

    const splits = useMemo(() => {
        const totalAmount = parseFloat(amount) || 0;
        const participantCount = selectedMemberIds.size;

        if (participantCount === 0) return [];

        if (!isUnequal) {
            const equalAmount = totalAmount / participantCount;
            return Array.from(selectedMemberIds).map(id => ({
                userId: id,
                amountOwed: equalAmount
            }));
        } else {
            return Array.from(selectedMemberIds).map(id => ({
                userId: id,
                amountOwed: parseFloat(manualAmounts[id]) || 0
            }));
        }
    }, [amount, selectedMemberIds, isUnequal, manualAmounts]);

    const currentSplitTotal = useMemo(() => {
        return splits.reduce((sum, s) => sum + s.amountOwed, 0);
    }, [splits]);

    const isTotalValid = useMemo(() => {
        if (!isUnequal) return true;
        const totalAmount = parseFloat(amount) || 0;
        return totalAmount > 0 && Math.abs(currentSplitTotal - totalAmount) < 0.01;
    }, [isUnequal, currentSplitTotal, amount]);

    const handleUpdateExpense = async () => {
        if (!description.trim() || !amount || !id) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        if (selectedMemberIds.size === 0) {
            Alert.alert("Error", "At least one person must be involved.");
            return;
        }

        if (!isTotalValid) {
            Alert.alert("Error", "The split total does not match the total amount.");
            return;
        }

        if (!user) return;

        setLoading(true);
        try {
            await expenseService.updateExpense(
                id,
                user.id,
                description,
                parseFloat(amount),
                user.id, // Updating payer as current user is usually the intent if they edit, but actually we should keep original payer?
                // For now keeping it simple: current user (who might be creator) edits it.
                splits
            );
            Alert.alert("Success", "Expense updated!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (err: any) {
            Alert.alert("Error", err.message || "Could not update expense.");
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
            <Stack.Screen options={{
                title: "Edit Expense",
                headerLeft: () => (
                    <Pressable onPress={() => router.back()} className="ml-4">
                        <ArrowLeft size={24} color="#0f172a" />
                    </Pressable>
                )
            }} />
            <ScrollView className="flex-1 px-6 pt-6">
                <View className="mb-6">
                    <Text className="text-3xl font-bold text-slate-900 mb-2">Edit Expense</Text>
                    <Text className="text-slate-500 text-base">Identify changes and update splits.</Text>
                </View>

                <View className="gap-6 pb-10">
                    <View>
                        <Text className="mb-2 font-medium text-slate-700">Description</Text>
                        <View className="flex-row items-center border border-slate-300 rounded-xl bg-slate-50 px-4">
                            <FileText size={20} color="#64748b" />
                            <TextInput
                                placeholder="e.g. Pizza, Grocery"
                                value={description}
                                onChangeText={setDescription}
                                className="flex-1 py-3 ml-3 text-base"
                            />
                        </View>
                    </View>

                    <View>
                        <Text className="mb-2 font-medium text-slate-700">Total Amount</Text>
                        <View className="flex-row items-center border border-slate-300 rounded-xl bg-slate-50 px-4">
                            <DollarSign size={20} color="#64748b" />
                            <TextInput
                                placeholder="0.00"
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                                className="flex-1 py-3 ml-3 text-base"
                            />
                        </View>
                    </View>

                    <View className="flex-row items-center justify-between py-2">
                        <View>
                            <Text className="font-bold text-slate-900">Split Unequally</Text>
                            <Text className="text-xs text-slate-500">Manually set amounts per person</Text>
                        </View>
                        <Switch
                            value={isUnequal}
                            onValueChange={setIsUnequal}
                            trackColor={{ false: "#e2e8f0", true: "#10b981" }}
                        />
                    </View>

                    <View>
                        <Text className="mb-4 font-bold text-slate-900">Participants</Text>
                        {members.map(member => (
                            <View key={member.id} className="flex-row items-center justify-between mb-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <Pressable
                                    onPress={() => toggleMember(member.id)}
                                    className="flex-row items-center flex-1"
                                >
                                    <View className={`w-6 h-6 rounded border ${selectedMemberIds.has(member.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'} items-center justify-center`}>
                                        {selectedMemberIds.has(member.id) && <Check size={14} color="white" />}
                                    </View>
                                    <View className="ml-3">
                                        <Text className={`font-medium ${selectedMemberIds.has(member.id) ? 'text-slate-900' : 'text-slate-400'}`}>
                                            {member.full_name || member.email}
                                        </Text>
                                        {!isUnequal && selectedMemberIds.has(member.id) && (
                                            <Text className="text-xs text-emerald-600 font-bold">
                                                $ {(parseFloat(amount) / selectedMemberIds.size || 0).toFixed(2)}
                                            </Text>
                                        )}
                                    </View>
                                </Pressable>

                                {isUnequal && selectedMemberIds.has(member.id) && (
                                    <View className="w-24 flex-row items-center border-b border-slate-300">
                                        <Text className="text-slate-400 font-bold">$ </Text>
                                        <TextInput
                                            placeholder="0.00"
                                            value={manualAmounts[member.id] || ''}
                                            onChangeText={(val) => setManualAmounts(prev => ({ ...prev, [member.id]: val }))}
                                            keyboardType="numeric"
                                            className="flex-1 py-1 text-right font-bold"
                                        />
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>

                    {isUnequal && !isTotalValid && selectedMemberIds.size > 0 && parseFloat(amount) > 0 && (
                        <View className="bg-rose-50 p-4 rounded-xl border border-rose-100 flex-row items-center">
                            <X size={18} color="#ef4444" />
                            <Text className="ml-2 text-rose-600 text-xs font-medium flex-1">
                                Split total ($ {currentSplitTotal.toFixed(2)}) must equal $ {(parseFloat(amount) || 0).toFixed(2)}
                            </Text>
                        </View>
                    )}

                    <View className="mt-4">
                        <Button
                            label={loading ? "Updating..." : "Update Expense"}
                            onPress={handleUpdateExpense}
                            disabled={loading || !isTotalValid}
                        />
                        <Button
                            label="Cancel"
                            variant="secondary"
                            className="mt-3"
                            onPress={() => router.back()}
                            disabled={loading}
                        />
                    </View>

                    {userProfile?.subscription_tier === 'free' && <AdBanner />}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
