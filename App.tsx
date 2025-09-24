import React, { useState, useEffect } from "react";
import { View, Text, Alert } from "react-native";
import { PaperProvider, ActivityIndicator } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
	const { theme, isDark } = useTheme(); // Get both theme and isDark state

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

			if (session?.user) {
				checkOnboardingStatus(session.user);
			} else {
				setAppState("auth");
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	const checkOnboardingStatus = async (user: User) => {
		try {
			console.log("🔍 Checking onboarding status for:", user.email);
			console.log("User metadata:", user.user_metadata);

			// First check: If user has needs_onboarding flag in metadata, show onboarding
			if (user.user_metadata?.needs_onboarding === true) {
				console.log("✨ needs_onboarding flag found, showing onboarding");
				setAppState("onboarding");
				return;
			}

			// Second check: Look for profile in database
			const { data: userProfile, error } = await supabase
				.from("users")
				.select("id, display_name")
				.eq("id", user.id)
				.single();

			if (error && error.code === "PGRST116") {
				// User doesn't exist in users table, needs onboarding
				console.log("✨ User not found in users table, needs onboarding");
				setAppState("onboarding");
				return;
			}

			if (error) {
				console.error("❌ Error checking onboarding status:", error);
				// On error, default to onboarding to be safe
				console.log("🔄 Defaulting to onboarding due to error");
				setAppState("onboarding");
				return;
			}

			// If user exists in users table, go to main app
			if (userProfile) {
				console.log("✅ User profile found, going to main app");
				setAppState("main");
			} else {
				console.log("🤔 No user profile found, needs onboarding");
				setAppState("onboarding");
			}
		} catch (error) {
			console.error("❌ Exception in onboarding check:", error);
			console.log("🔄 Defaulting to onboarding due to exception");
			setAppState("onboarding");
		}
	};

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
				<ActivityIndicator size="large" />
				<Text style={{ marginTop: 16, color: theme.colors.onBackground }}>
					Loading...
				</Text>
			</View>
		);
	}

	return (
		<NavigationContainer>
			<StatusBar style={isDark ? "light" : "dark"} />
			{appState === "auth" && <AuthNavigator />}
			{appState === "onboarding" && (
				<OnboardingScreen user={user!} onComplete={() => setAppState("main")} />
			)}
			{appState === "main" && <MainNavigator />}
		</NavigationContainer>
	);
};

// Main App wrapper with all providers
const App = () => {
	return (
		<SafeAreaProvider>
			<ThemeProvider>
				<PaperProvider>
					<AppContent />
				</PaperProvider>
			</ThemeProvider>
		</SafeAreaProvider>
	);
};

export default App;
