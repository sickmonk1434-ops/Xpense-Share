import React, { useState, useCallback } from 'react'
import { View, TextInput, Text, Pressable, Platform } from 'react-native'
import { useSignUp } from '@clerk/clerk-expo'
import { Button } from '../../components/Button'
import { Link, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useWarmUpBrowser } from '../../hooks/useWarmUpBrowser'

export default function SignUp() {
    useWarmUpBrowser();
    const { isLoaded, signUp, setActive } = useSignUp()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const signUpWithEmail = useCallback(async () => {
        if (!isLoaded) return

        setLoading(true)
        setError(null)
        try {
            const result = await signUp.create({
                emailAddress: email,
                password,
            })

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId })
                router.replace('/')
            } else {
                setError('Sign up incomplete. Check your email for verification!')
            }
        } catch (err: any) {
            setError(err.errors?.[0]?.message || "An error occurred during sign up")
        } finally {
            setLoading(false)
        }
    }, [isLoaded, email, password, signUp, setActive])

    return (
        <SafeAreaView className="flex-1 bg-white justify-center px-6">
            <View className="mb-10">
                <Text className="text-3xl font-bold text-slate-900 mb-2">Create Account</Text>
                <Text className="text-slate-500 text-base">Join Xpense Share today.</Text>
            </View>

            {error && (
                <View className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <Text className="text-red-600 text-sm font-medium">{error}</Text>
                </View>
            )}

            <View className="gap-4">
                <View>
                    <Text className="mb-2 font-medium text-slate-700">Email</Text>
                    <TextInput
                        onChangeText={(text) => setEmail(text)}
                        value={email}
                        placeholder="john@example.com"
                        autoCapitalize={'none'}
                        className="border border-slate-300 rounded-xl px-4 py-3 bg-slate-50 text-base"
                    />
                </View>
                <View>
                    <Text className="mb-2 font-medium text-slate-700">Password</Text>
                    <TextInput
                        onChangeText={(text) => setPassword(text)}
                        value={password}
                        secureTextEntry={true}
                        placeholder="••••••••"
                        autoCapitalize={'none'}
                        className="border border-slate-300 rounded-xl px-4 py-3 bg-slate-50 text-base"
                    />
                </View>
            </View>

            <View className="mt-6 gap-3">
                <Button label="Sign Up" onPress={signUpWithEmail} disabled={loading} />
            </View>

            <View className="mt-8 flex-row justify-center gap-1">
                <Text className="text-slate-600">Already have an account?</Text>
                <Link href="/(auth)/login" asChild>
                    <Pressable>
                        <Text className="text-emerald-600 font-bold">Sign In</Text>
                    </Pressable>
                </Link>
            </View>
        </SafeAreaView>
    )
}
