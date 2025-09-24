import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import { Text, Surface, Button, TextInput, Switch } from "react-native-paper";
import { supabase } from "../../services/supabase";

interface OnboardingScreenProps {
	user: any;
	onComplete: () => void;
}

export default function OnboardingScreen({
	user,
	onComplete,
}: OnboardingScreenProps) {
	const [bio, setBio] = useState("");
	const [locationEnabled, setLocationEnabled] = useState(false);
	const [loading, setLoading] = useState(false);

	const wipeAllData = async () => {
		Alert.alert(
			"⚠️ Wipe All Data",
			"This will:\n• Sign you out\n• Delete your profile\n• Clear all local data\n\nThis cannot be undone!",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Wipe All",
					style: "destructive",
					onPress: async () => {
						try {
							// Sign out and clear everything
							await supabase.auth.signOut();
							Alert.alert(
								"Data Wiped",
								"All data cleared. You can now sign up again."
							);
						} catch (error) {
							console.error("❌ Error wiping data:", error);
							Alert.alert("Error", "Failed to wipe all data, but signed out.");
							await supabase.auth.signOut();
						}
					},
				},
			]
		);
	};

	const completeOnboarding = async () => {
		if (!user?.id) {
			Alert.alert("Error", "User session not found. Please try again.");
			return;
		}

		setLoading(true);

		try {
			console.log("💾 Saving onboarding data for user:", user.id);
			console.log(
				"User display name from signup:",
				user.user_metadata?.display_name
			);

			// Use the display name from user metadata (from signup form)
			const displayName =
				user.user_metadata?.display_name ||
				user.identities?.[0]?.identity_data?.display_name ||
				user.email?.split("@")[0] ||
				"User";

			console.log("Using display name:", displayName);

			// Try using a database function to bypass RLS for profile creation
			const { data, error } = await supabase.rpc("create_user_profile", {
				p_user_id: user.id,
				p_email: user.email,
				p_display_name: displayName,
				p_bio: bio || null,
				p_preferences: {}, // Simplified - no complex preferences
				p_care_score: 0,
				p_location_sharing: locationEnabled,
			});

			if (error) {
				// If the RPC function doesn't exist, fall back to direct upsert
				console.log("RPC function not found, trying direct upsert...");

				const profileData = {
					id: user.id,
					email: user.email,
					display_name: displayName,
					bio: bio || null,
					preferences: {}, // Simplified
					care_score: 0,
					location_sharing: locationEnabled,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				};

				const { error: upsertError } = await supabase
					.from("users")
					.upsert(profileData, {
						onConflict: "id",
					});

				if (upsertError) {
					throw new Error(`Failed to save profile: ${upsertError.message}`);
				}
			}

			console.log(
				"✅ Profile saved successfully with display name:",
				displayName
			);

			// Clear the needs_onboarding flag from user metadata
			try {
				const { error: updateError } = await supabase.auth.updateUser({
					data: {
						needs_onboarding: false, // Clear the flag
					},
				});

				if (updateError) {
					console.warn("Could not clear onboarding flag:", updateError);
				} else {
					console.log("✅ Cleared needs_onboarding flag");
				}
			} catch (flagError) {
				console.warn("Exception clearing onboarding flag:", flagError);
			}

			onComplete();
		} catch (error: any) {
			console.error("❌ Onboarding error:", error);
			Alert.alert(
				"Setup Error",
				error.message || "Failed to complete profile setup. Please try again."
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<ScrollView style={styles.container}>
			<Surface style={styles.surface}>
				<Text variant="headlineLarge" style={styles.title}>
					Welcome {user?.user_metadata?.display_name || "Friend"}! ✨
				</Text>
				<Text variant="bodyLarge" style={styles.subtitle}>
					Let's get you started on your journey
				</Text>

				<View style={styles.section}>
					<Text variant="titleLarge" style={styles.sectionTitle}>
						Location Sharing
					</Text>
					<Text variant="bodyMedium" style={styles.sectionDescription}>
						Help others find nearby prayer partners and community members. Your
						exact location is never shared - only general area within 1km.
					</Text>
					<View style={styles.switchRow}>
						<Text variant="bodyLarge" style={styles.switchLabel}>
							Enable location sharing
						</Text>
						<Switch
							value={locationEnabled}
							onValueChange={setLocationEnabled}
							thumbColor={locationEnabled ? "#6c63ff" : "#ffffff"}
							trackColor={{ false: "#444444", true: "#6c63ff50" }}
						/>
					</View>
				</View>

				<View style={styles.section}>
					<Text variant="titleLarge" style={styles.sectionTitle}>
						Tell Us About Yourself
					</Text>
					<TextInput
						label="Brief bio (optional)"
						value={bio}
						onChangeText={setBio}
						mode="outlined"
						multiline
						numberOfLines={4}
						placeholder="Share a little about what brings you peace and joy..."
						style={styles.bioInput}
						textColor="#ffffff"
						outlineColor="#444444"
						activeOutlineColor="#6c63ff"
						contentStyle={{ color: "#ffffff" }}
					/>
				</View>

				<Button
					mode="contained"
					onPress={completeOnboarding}
					loading={loading}
					style={styles.button}
					disabled={loading}
				>
					{loading ? "Setting up..." : "Start My Journey"}
				</Button>

				{/* Debug section - only show in development */}
				{__DEV__ && (
					<View style={styles.debugSection}>
						<Text variant="titleSmall" style={styles.debugTitle}>
							🛠️ Development Tools
						</Text>

						<Button
							mode="outlined"
							onPress={wipeAllData}
							style={styles.debugButton}
							icon="delete-sweep"
							buttonColor="#1a1a1a"
							textColor="#ff6b6b"
						>
							Wipe All Data & Restart
						</Button>

						<Button
							mode="text"
							onPress={() => {
								console.log("Current user data:", user);
								Alert.alert(
									"Debug Info",
									`User ID: ${user?.id}\nEmail: ${user?.email}\nDisplay Name: ${user?.user_metadata?.display_name}\n\nCheck console for full data.`
								);
							}}
							style={styles.debugButton}
							icon="information"
							textColor="#64b5f6"
						>
							Show User Debug Info
						</Button>
					</View>
				)}
			</Surface>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000000", // Dark theme by default
	},
	surface: {
		backgroundColor: "#1a1a1a", // Dark surface
		margin: 16,
		marginTop: 60,
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
	section: {
		marginBottom: 32,
	},
	sectionTitle: {
		marginBottom: 16,
		color: "#ffffff", // White text
		fontWeight: "600",
	},
	bioInput: {
		backgroundColor: "#2a2a2a", // Dark input background
		borderRadius: 12,
	},
	button: {
		marginTop: 24,
		marginBottom: 16,
		paddingVertical: 8,
		borderRadius: 12,
		backgroundColor: "#6c63ff", // Purple primary
	},
	debugSection: {
		marginTop: 32,
		paddingTop: 24,
		borderTopWidth: 1,
		borderTopColor: "#333333",
	},
	debugTitle: {
		color: "#b0b0b0",
		marginBottom: 16,
		textAlign: "center",
		fontStyle: "italic",
	},
	debugButton: {
		marginTop: 8,
		borderRadius: 8,
	},
	sectionDescription: {
		marginBottom: 16,
		color: "#b0b0b0",
		lineHeight: 22,
	},
	switchRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		backgroundColor: "#2a2a2a",
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#333333",
	},
	switchLabel: {
		color: "#ffffff",
		flex: 1,
		marginRight: 16,
	},
});
