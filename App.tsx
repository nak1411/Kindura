import React, { useState, useEffect } from "react";
import { View, Text, Alert } from "react-native";
import { PaperProvider, ActivityIndicator } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { supabase } from "./src/services/supabase";
import type { User } from "@supabase/supabase-js";

// Import your existing components
import AuthNavigator from "./src/navigation/AuthNavigator";
import MainNavigator from "./src/navigation/MainNavigator";
import OnboardingScreen from "./src/screens/auth/OnboardingScreen";

// Import the new theme system
import { ThemeProvider, useTheme } from "./src/constants/theme-context";

type AppState = "loading" | "auth" | "onboarding" | "main";

// Main App Component that uses the theme
const AppContent: React.FC = () => {
	const [user, setUser] = useState<User | null>(null);
	const [appState, setAppState] = useState<AppState>("loading");
	const { theme } = useTheme(); // Now we can use the theme context

	useEffect(() => {
		// Get initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			console.log("📱 Initial session:", session?.user?.email || "No session");
			setUser(session?.user ?? null);

			if (session?.user) {
				// Check if user needs onboarding
				checkOnboardingStatus(session.user);
			} else {
				setAppState("auth");
			}
		});

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			console.log("🔄 Auth state changed:", event, session?.user?.email);
			setUser(session?.user ?? null);

			if (event === "SIGNED_IN" && session?.user) {
				checkOnboardingStatus(session.user);
			} else if (event === "SIGNED_OUT") {
				setAppState("auth");
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	const checkOnboardingStatus = async (user: User) => {
		try {
			console.log("🔍 Checking onboarding status for:", user.id);

			// Check if user profile exists and has completed onboarding
			const { data: profile, error } = await supabase
				.from("users")
				.select("*")
				.eq("id", user.id)
				.single();

			if (error && error.code !== "PGRST116") {
				// PGRST116 = no rows returned
				console.log("❌ Error checking profile:", error);
				setAppState("onboarding");
				return;
			}

			// Check if user has completed onboarding
			const hasCompletedOnboarding =
				profile &&
				profile.preferences &&
				Object.keys(profile.preferences).length > 0;

			if (hasCompletedOnboarding) {
				console.log("✅ User has completed onboarding - going to main app");
				setAppState("main");
			} else {
				console.log("📝 User needs onboarding");
				setAppState("onboarding");
			}
		} catch (error) {
			console.error("❌ Error checking onboarding:", error);
			setAppState("onboarding");
		}
	};

	const handleOnboardingComplete = () => {
		console.log("🎉 Onboarding completed, transitioning to main app");
		setAppState("main");

		setTimeout(() => {
			Alert.alert(
				"Welcome to Kindura! ✨",
				"Your profile has been set up. Enjoy your journey of gentle connections!"
			);
		}, 500);
	};

	console.log("🎯 Current app state:", appState);

	if (appState === "loading") {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center",
					backgroundColor: theme.colors.background,
				}}
			>
				<ActivityIndicator size="large" color={theme.colors.primary} />
				<Text
					style={{
						marginTop: 16,
						color: theme.colors.outline,
					}}
				>
					Loading Kindura...
				</Text>
			</View>
		);
	}

	return (
		<NavigationContainer>
			<StatusBar style={theme.dark ? "light" : "dark"} />
			{appState === "auth" && <AuthNavigator />}
			{appState === "onboarding" && (
				<OnboardingScreen onComplete={handleOnboardingComplete} user={user} />
			)}
			{appState === "main" && <MainNavigator />}
		</NavigationContainer>
	);
};

// Root App Component with ThemeProvider
export default function App() {
	return (
		<ThemeProvider>
			<ThemedApp />
		</ThemeProvider>
	);
}

// Wrapper to provide PaperProvider with theme
const ThemedApp: React.FC = () => {
	const { theme } = useTheme();

	return (
		<PaperProvider theme={theme}>
			<AppContent />
		</PaperProvider>
	);
};
