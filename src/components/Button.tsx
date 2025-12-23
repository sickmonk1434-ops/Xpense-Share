import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';
import React from 'react';

interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    className?: string;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    label,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    icon,
}) => {
    const baseStyles = "flex-row items-center justify-center rounded-xl font-semibold";

    const variants = {
        primary: "bg-indigo-600 text-white",
        secondary: "bg-slate-800 text-white",
        outline: "border-2 border-slate-200 bg-transparent text-slate-900",
        ghost: "bg-transparent text-slate-600",
        danger: "bg-red-500 text-white",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-5 py-3 text-base",
        lg: "px-6 py-4 text-lg",
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50' : ''} ${className}`}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#4f46e5' : 'white'} />
            ) : (
                <View className="flex-row items-center">
                    {icon && <View className="mr-2">{icon}</View>}
                    <Text className={`font-bold ${variant === 'outline' || variant === 'ghost' ? 'text-slate-900' : 'text-white'}`}>
                        {label}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};
