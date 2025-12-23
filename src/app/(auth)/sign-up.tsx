import React, { useState } from 'react'
import { Alert, View, TextInput, Text, Pressable } from 'react-native'
import { useSignUp } from '@clerk/clerk-expo'
import { Button } from '../../components/Button'
import { Link, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function SignUp() {
    const { isLoaded, signUp, setActive } = useSignUp()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    async function signUpWithEmail() {
        if (!isLoaded) return

        setLoading(true)
        try {
            const result = await signUp.create({
                emailAddress: email,
                password,
            })

            // In a real app, you would handle email verification here.
            // For now, we'll try to set the session if it's already complete.
            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId })
                router.replace('/')
            } else {
                // Sign up is created but needs verification (email code, etc.)
                Alert.alert('Success', 'Check your email for verification!')
            }
        } catch (err: any) {
            Alert.alert("Sign Up Error", err.errors?.[0]?.message || "An error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-white justify-center px-6">
            <View className="mb-10">
                <Text className="text-3xl font-bold text-slate-900 mb-2">Create Account</Text>
                <Text className="text-slate-500 text-base">Join Xpense Share today.</Text>
            </View>

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
