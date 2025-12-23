import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Card } from './Card';
import { Group } from '../types/group';
import { Users, ChevronRight } from 'lucide-react-native';

interface GroupCardProps {
    group: Group;
    onPress: (id: string) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({ group, onPress }) => {
    return (
        <Pressable onPress={() => onPress(group.id)}>
            <Card className="mb-3 hover:bg-slate-50 transition-colors">
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <View className="w-12 h-12 bg-emerald-100 rounded-xl items-center justify-center mr-4 overflow-hidden">
                            {group.icon_url ? (
                                <Image source={{ uri: group.icon_url }} className="w-full h-full" />
                            ) : (
                                <Users size={24} color="#10b981" />
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>
                                {group.name}
                            </Text>
                            <Text className="text-slate-500 text-sm">
                                {group.member_count || 1} members
                            </Text>
                        </View>
                    </View>
                    <ChevronRight size={20} color="#94a3b8" />
                </View>
            </Card>
        </Pressable>
    );
};
