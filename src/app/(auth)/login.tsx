import React, { useState, useCallback } from 'react'
import { View, TextInput, Text, Pressable, Platform, Image as RNImage } from 'react-native'
import * as Linking from 'expo-linking'
import { useSignIn, useOAuth } from '@clerk/clerk-expo'
import { Button } from '../../components/Button'
import { Link, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useWarmUpBrowser } from '../../hooks/useWarmUpBrowser'

export default function Login() {
    useWarmUpBrowser();
    const { signIn, setActive, isLoaded } = useSignIn()
    const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const signInWithEmail = useCallback(async () => {
        if (!isLoaded) return

        setLoading(true)
        setError(null)
        try {
            const result = await signIn.create({
                identifier: email,
                password,
            })

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId })
                router.replace('/')
            } else {
                setError("Login incomplete. Please check your verification.")
            }
        } catch (err: any) {
            setError(err.errors?.[0]?.message || "An error occurred during sign in")
        } finally {
            setLoading(false)
        }
    }, [isLoaded, email, password, signIn, setActive])

    const signInWithGoogle = useCallback(async () => {
        try {
            const { createdSessionId, signIn, signUp, setActive } = await startOAuthFlow({
                redirectUrl: Linking.createURL(Platform.OS === 'web' ? '/' : '/oauth-native-callback', { scheme: 'xpense-share' })
            });
            if (createdSessionId) {
                setActive!({ session: createdSessionId });
                router.replace("/");
            }
        } catch (err: any) {
            console.error("OAuth error", err);
            setError(err.errors?.[0]?.message || "Could not sign in with Google");
        }
    }, [startOAuthFlow])

    return (
        <SafeAreaView className="flex-1 bg-white justify-center px-6">
            <View className="mb-10 items-center">
                <RNImage
                    source={require('../../../assets/logo.jpg')}
                    className="w-24 h-24 mb-6"
                    resizeMode="contain"
                />
                <Text className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</Text>
                <Text className="text-slate-500 text-base">Sign in to continue splitting expenses.</Text>
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
