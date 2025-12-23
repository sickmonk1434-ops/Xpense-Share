import React, { useState } from 'react';
import { View, Text, TextInput, Alert, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { groupService } from '../services/group';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { Users, Image as ImageIcon } from 'lucide-react-native';

export default function CreateGroup() {
    const { user } = useUser();
    const [name, setName] = useState('');
    const [iconUrl, setIconUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Group name is required.");
            return;
        }

        if (!user) return;

        setLoading(true);
        try {
            const newGroup = await groupService.createGroup(user.id, name, iconUrl);
            if (Platform.OS === 'web') {
                window.alert("Group created successfully!");
                router.replace({ pathname: '/group/[id]', params: { id: newGroup.id } });
            } else {
                Alert.alert("Success", "Group created successfully!", [
                    { text: "OK", onPress: () => router.replace({ pathname: '/group/[id]', params: { id: newGroup.id } }) }
                ]);
            }
        } catch (err: any) {
            Alert.alert("Error", err.message || "Could not create group.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1 px-6 pt-6">
                <View className="mb-8">
                    <Text className="text-3xl font-bold text-slate-900 mb-2">Create New Group</Text>
                    <Text className="text-slate-500 text-base">Give your group a name and start splitting.</Text>
                </View>

                <View className="gap-6">
                    <View>
                        <Text className="mb-2 font-medium text-slate-700">Group Name</Text>
                        <View className="flex-row items-center border border-slate-300 rounded-xl bg-slate-50 px-4">
                            <Users size={20} color="#64748b" />
                            <TextInput
                                placeholder="e.g. Weekend Trip, Rent"
                                value={name}
                                onChangeText={setName}
                                className="flex-1 py-3 ml-3 text-base"
                            />
                        </View>
                    </View>

                    <View>
                        <Text className="mb-2 font-medium text-slate-700">Icon URL (Optional)</Text>
                        <View className="flex-row items-center border border-slate-300 rounded-xl bg-slate-50 px-4">
                            <ImageIcon size={20} color="#64748b" />
                            <TextInput
                                placeholder="https://example.com/icon.png"
                                value={iconUrl}
                                onChangeText={setIconUrl}
                                className="flex-1 py-3 ml-3 text-base"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View className="mt-4">
                        <Button
                            label={loading ? "Creating..." : "Create Group"}
                            onPress={handleCreate}
                            disabled={loading}
                        />
                        <Button
                            label="Cancel"
                            variant="secondary"
                            className="mt-3"
                            onPress={() => router.back()}
                            disabled={loading}
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
