import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Linking, Image, Alert } from 'react-native';
import { Megaphone, ExternalLink, X, Info } from 'lucide-react-native';
import { router } from 'expo-router';

const ADS = [
    {
        id: 'pro-1',
        type: 'internal',
        title: 'Unlock Xpense Pro',
        description: 'Remove all ads and unlock 50 group limits today!',
        cta: 'Upgrade Now',
        onPress: () => router.push('/profile')
    },
    {
        id: 'partner-1',
        type: 'external',
        title: 'Travel Smarter',
        description: 'Get 50,000 bonus points with the new Explorer Card.',
        cta: 'Learn More',
        url: 'https://example.com/partner-card'
    },
    {
        id: 'partner-2',
        type: 'external',
        title: 'Save on Groceries',
        description: 'Use code XPENSE to get 20% off your first FreshDash order.',
        cta: 'Get Code',
        url: 'https://example.com/freshdash'
    }
];

export function AdBanner() {
    const [adIndex, setAdIndex] = useState(0);
    const currentAd = ADS[adIndex];

    useEffect(() => {
        const interval = setInterval(() => {
            setAdIndex((prev) => (prev + 1) % ADS.length);
        }, 8000); // Rotate every 8 seconds
        return () => clearInterval(interval);
    }, []);

    const handlePress = () => {
        if (currentAd.type === 'internal' && currentAd.onPress) {
            currentAd.onPress();
        } else if (currentAd.url) {
            Linking.openURL(currentAd.url);
        }
    };

    return (
        <View className="mt-8 mb-4 border border-slate-200 rounded-2xl bg-slate-50 overflow-hidden">
            <View className="bg-slate-200 px-3 py-1 flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <Info size={10} style={{ color: '#64748b' }} />
                    <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1">Sponsored</Text>
                </View>
                <Pressable onPress={() => Alert.alert("Premium", "Upgrade to Pro to remove all advertisements.")}>
                    <X size={12} style={{ color: '#64748b' }} />
                </Pressable>
            </View>

            <Pressable onPress={handlePress} className="p-4 flex-row items-center">
                <View className="w-12 h-12 bg-white rounded-xl items-center justify-center border border-slate-100 shadow-sm mr-4">
                    <Megaphone size={24} style={{ color: currentAd.type === 'internal' ? '#10b981' : '#6366f1' }} />
                </View>

                <View className="flex-1">
                    <Text className="text-slate-900 font-bold text-sm" numberOfLines={1}>{currentAd.title}</Text>
                    <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={2}>{currentAd.description}</Text>

                    <View className="flex-row items-center mt-2">
                        <Text className="text-emerald-600 font-bold text-xs uppercase">{currentAd.cta}</Text>
                        {currentAd.type === 'external' && <ExternalLink size={10} style={{ color: '#10b981', marginLeft: 4 }} />}
                    </View>
                </View>
            </Pressable>
        </View>
    );
}
