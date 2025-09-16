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

	const deleteUserAccountPermanently = async () => {
		Alert.alert(
			"⚠️ Delete Account Permanently",
			"This will PERMANENTLY delete your account and all data from both the database and authentication system. This cannot be undone!\n\nThis includes:\n• User profile and preferences\n• All interaction history\n• Authentication record\n• Local storage data",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "DELETE FOREVER",
					style: "destructive",
					onPress: async () => {
						try {
							console.log("🗑️ Starting permanent account deletion...");

							const {
								data: { session },
							} = await supabase.auth.getSession();

							if (!session?.access_token) {
								Alert.alert("Error", "No valid session found");
								return;
							}

							console.log("👤 Calling delete user function...");

							// Try to use the edge function for complete deletion (recommended)
							try {
								const { data, error } = await supabase.functions.invoke(
									"delete-user",
									{
										headers: {
											Authorization: `Bearer ${session.access_token}`,
										},
									}
								);

								if (error) {
									throw error;
								}

								console.log(
									"✅ User deletion completed via edge function:",
									data
								);

								// Clear local storage
								await AsyncStorage.clear();
								console.log("✅ Local storage cleared");

								// Show success message
								Alert.alert(
									"Account Deleted",
									"Your account has been permanently removed from our system. All your data has been deleted.",
									[
										{
											text: "OK",
											onPress: () => {
												// Navigation will be handled by auth state change
												console.log("✅ Account deletion completed");
											},
										},
									]
								);

								return; // Exit early if edge function worked
							} catch (functionError) {
								console.warn(
									"⚠️ Edge function failed, falling back to manual deletion:",
									functionError
								);

								// Fall back to manual deletion if edge function isn't available
								const {
									data: { user },
								} = await supabase.auth.getUser();

								if (!user) {
									Alert.alert("Error", "No user session found");
									return;
								}

								console.log("👤 Performing manual deletion for:", user.id);

								// Step 1: Delete all related user data in sequence
								// Delete user interactions first (foreign key dependencies)
								const { error: interactionsError } = await supabase
									.from("user_interactions")
									.delete()
									.eq("user_id", user.id);

								if (interactionsError) {
									console.warn(
										"⚠️ Failed to delete interactions:",
										interactionsError
									);
								} else {
									console.log("✅ User interactions deleted");
								}

								// Remove user from any parallel rooms they're currently in
								try {
									const { data: rooms } = await supabase
										.from("parallel_rooms")
										.select("id, current_participants")
										.contains("current_participants", [user.id]);

									if (rooms && rooms.length > 0) {
										for (const room of rooms) {
											const updatedParticipants =
												room.current_participants.filter(
													(id: string) => id !== user.id
												);

											await supabase
												.from("parallel_rooms")
												.update({ current_participants: updatedParticipants })
												.eq("id", room.id);
										}
										console.log("✅ Removed user from parallel rooms");
									}
								} catch (roomError) {
									console.warn("⚠️ Failed to remove from rooms:", roomError);
								}

								// Step 2: Delete user profile
								const { error: profileError } = await supabase
									.from("users")
									.delete()
									.eq("id", user.id);

								if (profileError) {
									console.error(
										"❌ Failed to delete user profile:",
										profileError
									);
									throw new Error(
										`Failed to delete profile: ${profileError.message}`
									);
								}
								console.log("✅ User profile deleted");

								// Step 3: Clear local storage
								await AsyncStorage.clear();
								console.log("✅ Local storage cleared");

								// Step 4: Sign out (auth user cannot be deleted without admin privileges)
								await supabase.auth.signOut();
								console.log("✅ User signed out");

								// Show partial success message
								Alert.alert(
									"Account Data Deleted",
									"Your profile and app data have been deleted. However, your authentication record remains active. For complete account deletion including login credentials, please contact support.",
									[
										{
											text: "OK",
											onPress: () => {
												console.log("✅ Partial account deletion completed");
											},
										},
									]
								);
							}
						} catch (error: any) {
							console.error("❌ Error during account deletion:", error);

							// Even if there were errors, still sign out for safety
							try {
								await supabase.auth.signOut();
								await AsyncStorage.clear();
							} catch (signOutError) {
								console.error("❌ Failed to sign out:", signOutError);
							}

							Alert.alert(
								"Deletion Error",
								`There was an issue deleting your account: ${
									error.message || "Unknown error"
								}. You have been signed out for security. Some data may remain - please contact support if needed.`
							);
						}
					},
				},
			]
		);
	};

	// Enhanced development-only function for complete cleanup
	const devCompleteWipe = async () => {
		if (!__DEV__) return;

		Alert.alert(
			"🧹 DEV: Complete System Wipe",
			"This development function will:\n• Delete ALL user data\n• Remove auth record\n• Clear local storage\n• Reset app state\n\nOnly use for testing!",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "DEV WIPE ALL",
					style: "destructive",
					onPress: async () => {
						try {
							const {
								data: { user },
							} = await supabase.auth.getUser();

							if (user) {
								// Use the same deletion logic as permanent delete
								await deleteUserAccountPermanently();
							} else {
								// If no user, just clear storage and reset
								await AsyncStorage.clear();
								Alert.alert(
									"Dev Wipe",
									"Local storage cleared. No user to delete."
								);
							}
						} catch (error) {
							console.error("Dev wipe error:", error);
							await AsyncStorage.clear();
							await supabase.auth.signOut();
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

						{/* Development only - complete wipe */}
						{__DEV__ && (
							<Button
								mode="outlined"
								onPress={devCompleteWipe}
								style={styles.button}
								buttonColor="#ffebee"
								textColor="#d32f2f"
								icon="nuke"
							>
								🧹 DEV: Complete System Wipe
							</Button>
						)}
					</Card.Content>
				</Card>

				<Card style={styles.section}>
					<Card.Content>
						<Text variant="titleMedium" style={styles.dangerTitle}>
							⚠️ Danger Zone
						</Text>

						<Button
							mode="contained"
							onPress={deleteUserAccountPermanently}
							style={styles.button}
							buttonColor="#d32f2f"
							icon="account-remove"
						>
							Delete Account Permanently
						</Button>

						<Text variant="bodySmall" style={styles.warningText}>
							This will permanently delete your account, profile, and all
							associated data from both the database and authentication system.
						</Text>
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
	warningText: {
		marginTop: theme.spacing.sm,
		color: theme.colors.outline,
		fontStyle: "italic",
		textAlign: "center",
	},
	button: {
		marginBottom: theme.spacing.md,
	},
});
