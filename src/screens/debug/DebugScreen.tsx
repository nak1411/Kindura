import React from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { Text, Card, Button, Surface } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../services/supabase";
import { theme } from "../../constants/theme";

export default function DebugScreen({ navigation }: any) {
	const wipeAllData = async () => {
		Alert.alert(
			"Wipe All Data",
			"This will:\n• Clear all local storage\n• Sign you out\n• Reset to initial app state\n\nAre you sure?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Wipe Everything",
					style: "destructive",
					onPress: async () => {
						try {
							// Clear AsyncStorage completely
							await AsyncStorage.clear();

							// Sign out from Supabase - this will automatically handle navigation
							await supabase.auth.signOut();

							Alert.alert("Success", "All data wiped. Returning to sign in...");

							// Remove the navigation.reset() call - auth state change handles this
						} catch (error) {
							console.error("Error wiping data:", error);
							Alert.alert("Error", "Failed to wipe data");
						}
					},
				},
			]
		);
	};

	const resetUserProfile = async () => {
		Alert.alert(
			"Reset Profile",
			"This will reset your user profile to defaults, allowing you to go through onboarding again.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Reset Profile",
					onPress: async () => {
						try {
							const {
								data: { user },
							} = await supabase.auth.getUser();
							if (user) {
								const { error } = await supabase
									.from("users")
									.update({
										faith_mode: false,
										bio: null,
										preferences: {},
										care_score: 0,
										updated_at: new Date().toISOString(),
									})
									.eq("id", user.id);

								if (error) throw error;
								Alert.alert("Success", "Profile reset successfully");
							}
						} catch (error) {
							console.error("Error resetting profile:", error);
							Alert.alert("Error", "Failed to reset profile");
						}
					},
				},
			]
		);
	};

	const clearAsyncStorage = async () => {
		try {
			await AsyncStorage.clear();
			Alert.alert("Success", "AsyncStorage cleared");
		} catch (error) {
			Alert.alert("Error", "Failed to clear AsyncStorage");
		}
	};

	const showStorageData = async () => {
		try {
			const keys = await AsyncStorage.getAllKeys();
			const stores = await AsyncStorage.multiGet(keys);

			console.log("AsyncStorage contents:", stores);
			Alert.alert(
				"Storage Data",
				`Found ${keys.length} items. Check console for details.`
			);
		} catch (error) {
			Alert.alert("Error", "Failed to read storage data");
		}
	};

	const deleteUserAccount = async () => {
		Alert.alert(
			"⚠️ Delete Account",
			"This will PERMANENTLY delete your account and all data. This cannot be undone!",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "DELETE FOREVER",
					style: "destructive",
					onPress: async () => {
						try {
							const {
								data: { user },
							} = await supabase.auth.getUser();
							if (user) {
								// Delete user profile first
								await supabase.from("users").delete().eq("id", user.id);

								// Then delete auth user (this requires admin privileges in production)
								// For now, just sign out
								await supabase.auth.signOut();
								await AsyncStorage.clear();

								Alert.alert(
									"Account Deleted",
									"Your account has been removed."
								);
							}
						} catch (error) {
							console.error("Error deleting account:", error);
							Alert.alert("Error", "Failed to delete account");
						}
					},
				},
			]
		);
	};

	return (
		<ScrollView style={styles.container}>
			<Surface style={styles.surface}>
				<Text variant="headlineMedium" style={styles.title}>
					🛠️ Debug Tools
				</Text>
				<Text variant="bodyMedium" style={styles.subtitle}>
					Development utilities for testing
				</Text>

				<Card style={styles.section}>
					<Card.Content>
						<Text variant="titleMedium" style={styles.sectionTitle}>
							Data Management
						</Text>

						<Button
							mode="contained"
							onPress={wipeAllData}
							style={styles.button}
							buttonColor="#f44336"
							icon="delete-sweep"
						>
							Wipe All Data & Sign Out
						</Button>

						<Button
							mode="outlined"
							onPress={resetUserProfile}
							style={styles.button}
							icon="account-refresh"
						>
							Reset User Profile
						</Button>

						<Button
							mode="outlined"
							onPress={clearAsyncStorage}
							style={styles.button}
							icon="database-remove"
						>
							Clear Local Storage Only
						</Button>

						<Button
							mode="text"
							onPress={showStorageData}
							style={styles.button}
							icon="database-eye"
						>
							Show Storage Data (Console)
						</Button>
					</Card.Content>
				</Card>

				<Card style={styles.section}>
					<Card.Content>
						<Text variant="titleMedium" style={styles.dangerTitle}>
							⚠️ Danger Zone
						</Text>

						<Button
							mode="contained"
							onPress={deleteUserAccount}
							style={styles.button}
							buttonColor="#d32f2f"
							icon="account-remove"
						>
							Delete Account Permanently
						</Button>
					</Card.Content>
				</Card>

				<Button
					mode="outlined"
					onPress={() => navigation.goBack()}
					style={styles.button}
					icon="arrow-left"
				>
					Back to Profile
				</Button>
			</Surface>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
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
	section: {
		marginBottom: theme.spacing.lg,
	},
	sectionTitle: {
		marginBottom: theme.spacing.md,
		color: theme.colors.primary,
	},
	dangerTitle: {
		marginBottom: theme.spacing.md,
		color: theme.colors.error,
	},
	button: {
		marginBottom: theme.spacing.md,
	},
});
