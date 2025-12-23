import { View, Text } from 'react-native';
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    subtitle?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle }) => {
    return (
        <View className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 ${className}`}>
            {(title || subtitle) && (
                <View className="mb-4">
                    {title && <Text className="text-xl font-bold text-slate-900">{title}</Text>}
                    {subtitle && <Text className="text-sm text-slate-500">{subtitle}</Text>}
                </View>
            )}
            {children}
        </View>
    );
};
