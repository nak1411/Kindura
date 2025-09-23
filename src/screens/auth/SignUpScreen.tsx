import React, { useState } from "react";
import { View, StyleSheet, Alert, ScrollView } from "react-native";
import { Button, TextInput, Text, Surface } from "react-native-paper";
import { supabase } from "../../services/supabase";

export default function SignUpScreen({ navigation }: any) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [phone, setPhone] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSignUp = async () => {
		if (!email || !password || !displayName) {
			Alert.alert("Error", "Please fill in all required fields");
			return;
		}

		setLoading(true);

		try {
			// Check if email confirmation is enabled
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						display_name: displayName,
						phone: phone || null,
						needs_onboarding: true,
					},
				},
			});

			if (error) {
				throw error;
			}

			if (!data.user) {
				throw new Error("User creation failed");
			}

			// Check if user is immediately confirmed (email confirmation disabled)
			if (data.user.email_confirmed_at) {
				Alert.alert(
					"Account Created! ✨",
					"Welcome to Kindura! Let's set up your profile.",
					[
						{
							text: "Continue",
							onPress: () => {
								console.log(
									"User created and confirmed, auth state should change automatically"
								);
							},
						},
					]
				);
			} else {
				// Email confirmation required
				Alert.alert(
					"Check Your Email! 📧",
					`We've sent a confirmation link to ${email}. Please click the link to activate your account, then return to sign in.`,
					[
						{
							text: "Go to Sign In",
							onPress: () => navigation.navigate("Login"),
						},
					]
				);
			}
		} catch (error: any) {
			console.error("Sign up error:", error);
			Alert.alert("Error", error.message || "Failed to create account");
		} finally {
			setLoading(false);
		}
	};

	return (
		<ScrollView style={styles.container}>
			<Surface style={styles.surface}>
				<Text variant="headlineLarge" style={styles.title}>
					Join Kindura ✨
				</Text>
				<Text variant="bodyLarge" style={styles.subtitle}>
					Create your account for connections
				</Text>

				<TextInput
					label="Display Name *"
					value={displayName}
					onChangeText={setDisplayName}
					mode="outlined"
					style={styles.input}
					textColor="#ffffff"
					outlineColor="#444444"
					activeOutlineColor="#6c63ff"
					contentStyle={{ color: "#ffffff" }}
				/>

				<TextInput
					label="Email *"
					value={email}
					onChangeText={setEmail}
					mode="outlined"
					style={styles.input}
					autoCapitalize="none"
					keyboardType="email-address"
					textColor="#ffffff"
					outlineColor="#444444"
					activeOutlineColor="#6c63ff"
					contentStyle={{ color: "#ffffff" }}
				/>

				<TextInput
					label="Phone (optional)"
					value={phone}
					onChangeText={setPhone}
					mode="outlined"
					style={styles.input}
					keyboardType="phone-pad"
					textColor="#ffffff"
					outlineColor="#444444"
					activeOutlineColor="#6c63ff"
					contentStyle={{ color: "#ffffff" }}
				/>

				<TextInput
					label="Password *"
					value={password}
					onChangeText={setPassword}
					mode="outlined"
					secureTextEntry
					style={styles.input}
					textColor="#ffffff"
					outlineColor="#444444"
					activeOutlineColor="#6c63ff"
					contentStyle={{ color: "#ffffff" }}
				/>

				<Button
					mode="contained"
					onPress={handleSignUp}
					loading={loading}
					style={styles.button}
					buttonColor="#6c63ff"
					textColor="#ffffff"
				>
					Create Account
				</Button>

				<Button
					mode="text"
					onPress={() => navigation.navigate("Login")}
					style={styles.linkButton}
					textColor="#b0b0b0"
				>
					Already have an account? Sign in
				</Button>
			</Surface>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000000", // Dark background
		padding: 16,
	},
	surface: {
		backgroundColor: "#1a1a1a", // Dark surface
		padding: 32,
		borderRadius: 24,
		marginTop: 60,
		borderWidth: 1,
		borderColor: "#333333",
	},
	title: {
		textAlign: "center",
		marginBottom: 8,
		color: "#ffffff", // White text
		fontWeight: "bold",
	},
	subtitle: {
		textAlign: "center",
		marginBottom: 40,
		color: "#b0b0b0", // Light gray
		lineHeight: 24,
	},
	input: {
		marginBottom: 16,
		backgroundColor: "#2a2a2a", // Dark input background
		borderRadius: 12,
	},
	button: {
		marginTop: 24,
		marginBottom: 16,
		paddingVertical: 8,
		borderRadius: 12,
	},
	linkButton: {
		marginTop: 8,
	},
});
