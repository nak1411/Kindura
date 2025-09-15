import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { View, Text, Alert } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { supabase } from "./src/services/supabase";
import { theme } from "./src/constants/theme";
import AuthNavigator from "./src/navigation/AuthNavigator";
import MainNavigator from "./src/navigation/MainNavigator";
import OnboardingScreen from "./src/screens/auth/OnboardingScreen";
import { Session } from "@supabase/supabase-js";

type AppState = "loading" | "auth" | "onboarding" | "main";

export default function App() {
	const [session, setSession] = useState<Session | null>(null);
	const [user, setUser] = useState<any>(null);
	const [appState, setAppState] = useState<AppState>("loading");

	useEffect(() => {
		initializeAuth();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			console.log("=== Auth State Change ===");
			console.log("Event:", event);
			console.log("Session exists:", !!session);
			console.log("Current app state:", appState);
			console.log("========================");

			setSession(session);

			if (!session) {
				console.log("🚪 No session - going to auth");
				setAppState("auth");
				setUser(null);
			} else if (appState === "loading") {
				// Only check for onboarding on initial load, not on subsequent auth changes
				await determineUserState(session.user);
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	const initializeAuth = async () => {
		try {
			console.log("🔄 Initializing auth...");

			const {
				data: { session },
				error,
			} = await supabase.auth.getSession();

			if (error) {
				console.error("❌ Error getting session:", error);
				setAppState("auth");
				return;
			}

			setSession(session);

			if (!session) {
				console.log("🚪 No session found - showing auth");
				setAppState("auth");
			} else {
				await determineUserState(session.user);
			}
		} catch (error) {
			console.error("❌ Error initializing auth:", error);
			setAppState("auth");
		}
	};

	const determineUserState = async (authUser: any) => {
		try {
			console.log("🔍 Determining user state for:", authUser.id);

			// Check if user profile has preferences (indicating completed onboarding)
			const { data: userProfile, error } = await supabase
				.from("users")
				.select("*")
				.eq("id", authUser.id)
				.single();

			const userData = userProfile || {
				id: authUser.id,
				email: authUser.email,
				display_name: authUser.user_metadata?.display_name || "User",
				phone: authUser.user_metadata?.phone,
				faith_mode: false,
				care_score: 0,
				preferences: {},
			};

			setUser(userData);

			// Simple check: if preferences exist and aren't empty, skip onboarding
			const hasCompletedOnboarding =
				userProfile &&
				userProfile.preferences &&
				Object.keys(userProfile.preferences).length > 0;

			if (hasCompletedOnboarding) {
				console.log("✅ User has completed onboarding - going to main app");
				setAppState("main");
			} else {
				console.log("📝 User needs onboarding");
				setAppState("onboarding");
			}
		} catch (error) {
			console.error("❌ Error determining user state:", error);
			// Default to onboarding if we can't determine state
			setAppState("onboarding");
			setUser({
				id: authUser.id,
				email: authUser.email,
				display_name: authUser.user_metadata?.display_name || "User",
			});
		}
	};

	const handleOnboardingComplete = () => {
		console.log("🎉 Onboarding completed - going directly to main app");
		setAppState("main");

		setTimeout(() => {
			Alert.alert(
				"Welcome to Kindura! ✨",
				"Your profile has been set up. Enjoy your journey of gentle connections!"
			);
		}, 500);
	};

	// Render based on app state
	console.log("🎯 Current app state:", appState);

	if (appState === "loading") {
		return (
			<PaperProvider theme={theme}>
				<View
					style={{
						flex: 1,
						justifyContent: "center",
						alignItems: "center",
						backgroundColor: theme.colors.background,
					}}
				>
					<ActivityIndicator size="large" color={theme.colors.primary} />
					<Text style={{ marginTop: 16, color: theme.colors.outline }}>
						Loading Kindura...
					</Text>
				</View>
			</PaperProvider>
		);
	}

	return (
		<PaperProvider theme={theme}>
			<NavigationContainer>
				<StatusBar style="auto" />
				{appState === "auth" && <AuthNavigator />}
				{appState === "onboarding" && (
					<OnboardingScreen onComplete={handleOnboardingComplete} user={user} />
				)}
				{appState === "main" && <MainNavigator />}
			</NavigationContainer>
		</PaperProvider>
	);
}
