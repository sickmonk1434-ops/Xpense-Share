import React, { useState, useCallback } from 'react'
import { Alert, View, TextInput, Text, Pressable } from 'react-native'
import { useSignIn } from '@clerk/clerk-expo'
import { Button } from '../../components/Button'
import { Link, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Login() {
    const { signIn, setActive, isLoaded } = useSignIn()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const signInWithEmail = useCallback(async () => {
        if (!isLoaded) return

        setLoading(true)
        try {
            const result = await signIn.create({
                identifier: email,
                password,
            })

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId })
                router.replace('/')
            } else {
                console.log(JSON.stringify(result, null, 2))
                Alert.alert("Login Incomplete", "Please complete all verification steps.")
            }
        } catch (err: any) {
            Alert.alert("Login Error", err.errors?.[0]?.message || "An error occurred")
        } finally {
            setLoading(false)
        }
    }, [isLoaded, email, password, signIn, setActive])

    const signInWithGoogle = async () => {
        // TODO: improvements on Google Auth
        Alert.alert("Google Auth", "Requires Google Cloud setup and Deep linking configuration.")
    }

    return (
        <SafeAreaView className="flex-1 bg-white justify-center px-6">
            <View className="mb-10">
                <Text className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</Text>
                <Text className="text-slate-500 text-base">Sign in to continue splitting expenses.</Text>
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
                <Button label="Sign In" onPress={signInWithEmail} disabled={loading} />

                <View className="flex-row items-center gap-2 my-2">
                    <View className="h-[1px] bg-slate-200 flex-1" />
                    <Text className="text-slate-400">OR</Text>
                    <View className="h-[1px] bg-slate-200 flex-1" />
                </View>

                <Button label="Sign in with Google" variant="secondary" onPress={signInWithGoogle} />
            </View>

            <View className="mt-8 flex-row justify-center gap-1">
                <Text className="text-slate-600">Don't have an account?</Text>
                <Link href="/(auth)/sign-up" asChild>
                    <Pressable>
                        <Text className="text-emerald-600 font-bold">Sign Up</Text>
                    </Pressable>
                </Link>
            </View>
        </SafeAreaView>
    )
}
