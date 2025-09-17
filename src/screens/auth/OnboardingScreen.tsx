import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
	Button,
	Text,
	Surface,
	Switch,
	Chip,
	TextInput,
	Divider,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../services/supabase";
import { theme } from "../../constants/theme";

interface OnboardingScreenProps {
	onComplete: () => void;
	user: any;
}

export default function OnboardingScreen({
	onComplete,
	user,
}: OnboardingScreenProps) {
	const [faithMode, setFaithMode] = useState(false);
	const [voiceComfort, setVoiceComfort] = useState(true);
	const [videoComfort, setVideoComfort] = useState(false);
	const [selectedTopicsToAvoid, setSelectedTopicsToAvoid] = useState<string[]>(
		[]
	);
	const [bio, setBio] = useState("");
	const [loading, setLoading] = useState(false);

	const topicsToAvoid = [
		"Politics",
		"Work Stress",
		"Health Issues",
		"Relationship Problems",
		"Financial Concerns",
		"Family Drama",
		"Current Events",
	];

	const toggleTopicToAvoid = (topic: string) => {
		setSelectedTopicsToAvoid((prev) =>
			prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
		);
	};

	const wipeAllData = async () => {
		Alert.alert(
			"Wipe All Data",
			"This will:\n• Clear all local storage\n• Delete your account\n• Sign you out\n• Return to sign up\n\nAre you sure?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Wipe Everything",
					style: "destructive",
					onPress: async () => {
						try {
							console.log("🧹 Wiping all data...");

							// Clear AsyncStorage
							await AsyncStorage.clear();
							console.log("✅ AsyncStorage cleared");

							// Delete user profile from database (if it exists)
							if (user?.id) {
								const { error: deleteError } = await supabase
									.from("users")
									.delete()
									.eq("id", user.id);

								if (deleteError) {
									console.warn("Profile deletion failed:", deleteError);
								} else {
									console.log("✅ User profile deleted");
								}
							}

							// Sign out from Supabase
							await supabase.auth.signOut();
							console.log("✅ Signed out");

							Alert.alert(
								"Success",
								"All data wiped. You can now sign up again."
							);
						} catch (error) {
							console.error("❌ Error wiping data:", error);
							Alert.alert("Error", "Failed to wipe all data, but signed out.");
							// Still sign out even if other operations failed
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

			// Simple update - just save the preferences
			const { error } = await supabase
				.from("users")
				.update({
					faith_mode: faithMode,
					bio: bio || null,
					preferences: {
						voice_comfort: voiceComfort,
						video_comfort: videoComfort,
						topics_to_avoid: selectedTopicsToAvoid,
					},
					updated_at: new Date().toISOString(),
				})
				.eq("id", user.id);

			if (error) {
				throw new Error(`Failed to save profile: ${error.message}`);
			}

			console.log("✅ Profile saved successfully");

			// Call onComplete immediately after successful save
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
				<Text variant="headlineMedium" style={styles.title}>
					Welcome {user?.display_name || "Friend"}!
				</Text>
				<Text variant="bodyMedium" style={styles.subtitle}>
					Help us create the perfect space for you
				</Text>

				<View style={styles.section}>
					<Text variant="titleMedium" style={styles.sectionTitle}>
						Communication Comfort
					</Text>

					<View style={styles.switchRow}>
						<Text variant="bodyMedium">Voice conversations</Text>
						<Switch value={voiceComfort} onValueChange={setVoiceComfort} />
					</View>

					<View style={styles.switchRow}>
						<Text variant="bodyMedium">Video conversations</Text>
						<Switch value={videoComfort} onValueChange={setVideoComfort} />
					</View>
				</View>

				<View style={styles.section}>
					<Text variant="titleMedium" style={styles.sectionTitle}>
						Faith & Spirituality
					</Text>
					<Text variant="bodySmall" style={styles.sectionDescription}>
						Enable faith-based content like prayer circles and spiritual
						reflections
					</Text>
					<View style={styles.switchRow}>
						<Text variant="bodyMedium">Faith mode</Text>
						<Switch value={faithMode} onValueChange={setFaithMode} />
					</View>
				</View>

				<View style={styles.section}>
					<Text variant="titleMedium" style={styles.sectionTitle}>
						Topics
					</Text>
					<Text variant="bodySmall" style={styles.sectionDescription}>
						Select topics you'd prefer to avoid in conversations
					</Text>
					<View style={styles.chipContainer}>
						{topicsToAvoid.map((topic) => (
							<Chip
								key={topic}
								mode={
									selectedTopicsToAvoid.includes(topic) ? "flat" : "outlined"
								}
								selected={selectedTopicsToAvoid.includes(topic)}
								onPress={() => toggleTopicToAvoid(topic)}
								style={styles.chip}
							>
								{topic}
							</Chip>
						))}
					</View>
				</View>

				<View style={styles.section}>
					<Text variant="titleMedium" style={styles.sectionTitle}>
						Tell Us About Yourself
					</Text>
					<TextInput
						label="Brief bio (optional)"
						value={bio}
						onChangeText={setBio}
						mode="outlined"
						multiline
						numberOfLines={3}
						placeholder="Share a little about what brings you peace..."
						style={styles.bioInput}
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
					<>
						<Divider style={styles.divider} />
						<Text variant="titleSmall" style={styles.debugTitle}>
							🛠️ Development Tools
						</Text>

						<Button
							mode="outlined"
							onPress={wipeAllData}
							style={styles.debugButton}
							icon="delete-sweep"
							buttonColor="#ffebee"
							textColor="#d32f2f"
						>
							Wipe All Data & Restart
						</Button>

						<Button
							mode="text"
							onPress={() => {
								console.log("Current user data:", user);
								Alert.alert(
									"Debug Info",
									`User ID: ${user?.id}\nEmail: ${user?.email}\nDisplay Name: ${user?.display_name}\n\nCheck console for full data.`
								);
							}}
							style={styles.debugButton}
							icon="information"
						>
							Show User Debug Info
						</Button>
					</>
				)}
			</Surface>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	surface: {
		margin: theme.spacing.md,
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
		marginBottom: theme.spacing.sm,
		color: theme.colors.onSurface,
	},
	sectionDescription: {
		marginBottom: theme.spacing.md,
		color: theme.colors.outline,
		lineHeight: 20,
	},
	switchRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: theme.spacing.sm,
	},
	chipContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: theme.spacing.sm,
	},
	chip: {
		marginBottom: theme.spacing.sm,
	},
	bioInput: {
		marginTop: theme.spacing.sm,
	},
	button: {
		marginTop: theme.spacing.lg,
	},
	divider: {
		marginVertical: theme.spacing.lg,
	},
	debugTitle: {
		color: theme.colors.outline,
		marginBottom: theme.spacing.md,
		textAlign: "center",
	},
	debugButton: {
		marginTop: theme.spacing.sm,
	},
});
