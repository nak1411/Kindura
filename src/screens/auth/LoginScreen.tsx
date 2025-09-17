import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Button, TextInput, Text, Surface } from "react-native-paper";
import { supabase } from "../../services/supabase";
import { theme } from "../../constants/theme";

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
				<Text variant="headlineMedium" style={styles.title}>
					Welcome to Kindura
				</Text>
				<Text variant="bodyMedium" style={styles.subtitle}>
					Connections, meaningful moments
				</Text>

				<TextInput
					label="Email"
					value={email}
					onChangeText={setEmail}
					mode="outlined"
					style={styles.input}
					autoCapitalize="none"
				/>

				<TextInput
					label="Password"
					value={password}
					onChangeText={setPassword}
					mode="outlined"
					secureTextEntry
					style={styles.input}
				/>

				<Button
					mode="contained"
					onPress={handleLogin}
					loading={loading}
					style={styles.button}
				>
					Sign In
				</Button>

				<Button
					mode="text"
					onPress={() => navigation.navigate("SignUp")}
					style={styles.linkButton}
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
		backgroundColor: theme.colors.background,
		justifyContent: "center",
		padding: theme.spacing.md,
	},
	surface: {
		padding: theme.spacing.lg,
		borderRadius: 16,
	},
	title: {
		textAlign: "center",
		marginBottom: theme.spacing.sm,
		color: theme.colors.primary,
	},
	subtitle: {
		textAlign: "center",
		marginBottom: theme.spacing.xl,
		color: theme.colors.outline,
	},
	input: {
		marginBottom: theme.spacing.md,
	},
	button: {
		marginTop: theme.spacing.md,
		marginBottom: theme.spacing.sm,
	},
	linkButton: {
		marginTop: theme.spacing.sm,
	},
});
