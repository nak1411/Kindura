import React from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Card, Button, Surface } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../services/supabase";
import { useTheme } from "../../constants/theme-context";

export default function DebugScreen({ navigation }: any) {
	const { theme } = useTheme();

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
			"This will PERMANENTLY delete your account and all data. This cannot be undone!\n\nThis includes:\n• User profile and preferences\n• All interaction history\n• Authentication record\n• Local storage data",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "DELETE FOREVER",
					style: "destructive",
					onPress: async () => {
						try {
							console.log("🗑️ Starting permanent account deletion...");

							const {
								data: { user },
							} = await supabase.auth.getUser();

							if (!user) {
								Alert.alert("Error", "No user session found");
								return;
							}

							console.log("👤 Deleting user data for:", user.id);

							// Step 1: Delete user interactions (foreign key dependencies first)
							console.log("🔄 Deleting user interactions...");
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

							// Step 2: Remove user from parallel rooms
							console.log("🔄 Removing from parallel rooms...");
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

							// Step 3: Delete user profile
							console.log("🔄 Deleting user profile...");
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

							// Step 4: Clear local storage
							console.log("🔄 Clearing local storage...");
							await AsyncStorage.clear();
							console.log("✅ Local storage cleared");

							// Step 5: Delete auth user using direct SQL
							console.log("🔄 Attempting to delete auth record...");
							try {
								const { error: authDeleteError } = await supabase.rpc(
									"delete_auth_user",
									{
										user_id: user.id,
									}
								);

								if (authDeleteError) {
									console.warn(
										"⚠️ Auth deletion failed via RPC:",
										authDeleteError
									);
									throw authDeleteError;
								}

								console.log("✅ Auth user deleted successfully");

								// Show complete success message
								Alert.alert(
									"Account Completely Deleted",
									"Your account has been permanently and completely removed from our system, including all login credentials.",
									[
										{
											text: "OK",
											onPress: () => {
												console.log("✅ Complete account deletion successful");
											},
										},
									]
								);
							} catch (authError) {
								console.warn("⚠️ Could not delete auth record:", authError);

								// Sign out even if auth deletion failed
								await supabase.auth.signOut();

								// Show instructions for manual deletion
								Alert.alert(
									"Account Data Deleted",
									"Your profile and app data have been permanently deleted.\n\nAuth record deletion failed. Please:\n1. Contact support for complete removal\n2. Or manually delete from Supabase Dashboard\n\nYou have been signed out.",
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
			"This development function will:\n• Delete ALL user data\n• Clear local storage\n• Sign out\n• Reset app state\n\nOnly use for testing!",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "DEV WIPE ALL",
					style: "destructive",
					onPress: async () => {
						try {
							await deleteUserAccountPermanently();
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

	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.colors.background,
			padding: theme.spacing.md,
		},
		surface: {
			backgroundColor: theme.colors.surface,
			padding: theme.spacing.lg,
			borderRadius: 8,
			marginTop: 24,
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
			borderRadius: 8,
		},
	});

	return (
		<SafeAreaView style={styles.container} edges={["top"]}>
			<ScrollView showsVerticalScrollIndicator={false}>
				<Surface style={styles.surface}>
					<Text variant="headlineMedium" style={styles.title}>
						Debug & Development
					</Text>
					<Text variant="bodyMedium" style={styles.subtitle}>
						Tools for testing and troubleshooting
					</Text>

					<View style={styles.section}>
						<Text variant="titleLarge" style={styles.sectionTitle}>
							Storage Management
						</Text>

						<Button
							mode="outlined"
							onPress={showStorageData}
							style={styles.button}
							icon="database-eye"
						>
							View Storage Data
						</Button>

						<Button
							mode="outlined"
							onPress={clearAsyncStorage}
							style={styles.button}
							icon="delete-sweep"
						>
							Clear AsyncStorage
						</Button>
					</View>

					<View style={styles.section}>
						<Text variant="titleLarge" style={styles.sectionTitle}>
							Profile Management
						</Text>

						<Button
							mode="outlined"
							onPress={resetUserProfile}
							style={styles.button}
							icon="account-reactivate"
						>
							Reset User Profile
						</Button>
					</View>

					<View style={styles.section}>
						<Text variant="titleLarge" style={styles.dangerTitle}>
							⚠️ Danger Zone
						</Text>

						<Button
							mode="outlined"
							onPress={devCompleteWipe}
							style={styles.button}
							icon="nuke"
							buttonColor={theme.colors.errorContainer}
							textColor={theme.colors.error}
						>
							Nuke All User Data
						</Button>

						<Text variant="bodySmall" style={styles.warningText}>
							⚠️ Permanent deletion cannot be undone.
						</Text>
					</View>

					<Button
						mode="outlined"
						onPress={() => navigation.goBack()}
						style={styles.button}
						icon="arrow-left"
					>
						Back to Profile
					</Button>

					<Button
						mode="contained"
						onPress={() => navigation.navigate("Simulation")}
						style={{ margin: 16 }}
					>
						User Simulation
					</Button>
				</Surface>
			</ScrollView>
		</SafeAreaView>
	);
}
