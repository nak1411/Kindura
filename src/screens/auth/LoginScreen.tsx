import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Button, TextInput, Text, Surface } from "react-native-paper";
import { supabase } from "../../services/supabase";

export default function LoginScreen({ navigation }: any) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const handleLogin = async () => {
		setLoading(true);
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			Alert.alert("Error", error.message);
		}
		setLoading(false);
	};

	return (
		<View style={styles.container}>
			<Surface style={styles.surface}>
				<Text variant="headlineLarge" style={styles.title}>
					Welcome to Kindura ✨
				</Text>
				<Text variant="bodyLarge" style={styles.subtitle}>
					Connections, meaningful moments
				</Text>

				<TextInput
					label="Email"
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
					label="Password"
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
					onPress={handleLogin}
					loading={loading}
					style={styles.button}
					buttonColor="#6c63ff"
					textColor="#ffffff"
				>
					Sign In
				</Button>

				<Button
					mode="text"
					onPress={() => navigation.navigate("SignUp")}
					style={styles.linkButton}
					textColor="#b0b0b0"
				>
					Don't have an account? Sign up
				</Button>
			</Surface>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000000", // Dark background
		justifyContent: "center",
		padding: 16,
	},
	surface: {
		backgroundColor: "#1a1a1a", // Dark surface
		padding: 32,
		borderRadius: 24,
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
