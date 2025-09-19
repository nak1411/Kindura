import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import {
	Text,
	Avatar,
	Card,
	Button,
	Chip,
	Divider,
	Switch,
	List,
} from "react-native-paper";
import { supabase } from "../../services/supabase";
import { useTheme } from "../../constants/theme-context";
import { ThemeToggle } from "../../components/theme-toggle";

type Profile = {
	id: string;
	email: string;
	display_name: string;
	bio: string | null;
	care_score: number;
	faith_mode: boolean;
	preferences: any;
	notifications_enabled?: boolean;
	location_sharing?: boolean;
};

export default function ProfileScreen() {
	const [profile, setProfile] = useState<Profile | null>(null);
	const [loading, setLoading] = useState(true);
	const { theme } = useTheme(); // Use the theme context

	useEffect(() => {
		fetchProfile();
	}, []);

	const fetchProfile = async () => {
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) return;

			// Use array query instead of .single() to avoid PGRST116 error
			const { data: profiles, error } = await supabase
				.from("users")
				.select("*")
				.eq("id", user.id);

			if (error) {
				console.error("Error fetching profile:", error);
				return;
			}

			// Check if profile exists
			if (!profiles || profiles.length === 0) {
				console.log("No profile found for user:", user.id);
				// Could redirect to onboarding here if needed
				return;
			}

			const profileData = profiles[0];
			setProfile({
				...profileData,
				email: user.email || "",
			});
		} catch (error) {
			console.error("Error:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleSignOut = async () => {
		Alert.alert("Sign Out", "Are you sure you want to sign out?", [
			{
				text: "Cancel",
				style: "cancel",
			},
			{
				text: "Sign Out",
				style: "destructive",
				onPress: async () => {
					const { error } = await supabase.auth.signOut();
					if (error) {
						Alert.alert("Error", "Failed to sign out");
					}
				},
			},
		]);
	};

	const updatePreference = async (key: string, value: boolean) => {
		if (!profile) return;

		const { error } = await supabase
			.from("users")
			.update({ [key]: value })
			.eq("id", profile.id);

		if (error) {
			Alert.alert("Error", "Failed to update preference");
			return;
		}

		setProfile({ ...profile, [key]: value });
	};

	if (loading || !profile) {
		return (
			<View
				style={[styles.container, { backgroundColor: theme.colors.background }]}
			>
				<Text style={{ color: theme.colors.onBackground }}>Loading...</Text>
			</View>
		);
	}

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: theme.colors.background }]}
		>
			{/* Profile Header */}
			<Card
				style={[
					styles.profileHeader,
					{ backgroundColor: theme.colors.surface },
				]}
			>
				<Card.Content>
					<Avatar.Text
						size={80}
						label={profile.display_name.charAt(0).toUpperCase()}
						style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
					/>

					<Text
						variant="headlineSmall"
						style={[styles.displayName, { color: theme.colors.onSurface }]}
					>
						{profile.display_name}
					</Text>

					<View style={styles.badgeContainer}>
						<Text
							variant="titleMedium"
							style={[styles.badgeText, { color: theme.colors.primary }]}
						>
							Care Score: {profile.care_score}
						</Text>
						{profile.faith_mode && (
							<Chip
								mode="flat"
								compact
								style={{
									backgroundColor: theme.colors.primaryContainer,
									marginTop: 8,
								}}
								textStyle={{ color: theme.colors.onPrimaryContainer }}
								icon="hands-pray"
							>
								Faith Mode
							</Chip>
						)}
					</View>

					{profile.bio && (
						<Text
							variant="bodyMedium"
							style={[styles.bio, { color: theme.colors.onSurfaceVariant }]}
						>
							{profile.bio}
						</Text>
					)}
				</Card.Content>
			</Card>

			{/* Stats */}
			<Card
				style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}
			>
				<Card.Content>
					<Text
						variant="titleMedium"
						style={{ color: theme.colors.onSurface, marginBottom: 16 }}
					>
						Your Journey
					</Text>

					<View style={styles.statsRow}>
						<View style={styles.statItem}>
							<Text
								variant="headlineSmall"
								style={{ color: theme.colors.primary }}
							>
								0
							</Text>
							<Text
								variant="bodySmall"
								style={{ color: theme.colors.onSurfaceVariant }}
							>
								Quests
							</Text>
						</View>

						<View style={styles.statItem}>
							<Text
								variant="headlineSmall"
								style={{ color: theme.colors.primary }}
							>
								0
							</Text>
							<Text
								variant="bodySmall"
								style={{ color: theme.colors.onSurfaceVariant }}
							>
								Rooms
							</Text>
						</View>

						<View style={styles.statItem}>
							<Text
								variant="headlineSmall"
								style={{ color: theme.colors.primary }}
							>
								0
							</Text>
							<Text
								variant="bodySmall"
								style={{ color: theme.colors.onSurfaceVariant }}
							>
								Nudges
							</Text>
						</View>
					</View>
				</Card.Content>
			</Card>

			{/* Settings */}
			<Card
				style={[styles.settingsCard, { backgroundColor: theme.colors.surface }]}
			>
				<Card.Content>
					<Text
						variant="titleMedium"
						style={{ color: theme.colors.onSurface, marginBottom: 16 }}
					>
						Settings
					</Text>

					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text
								variant="bodyLarge"
								style={{ color: theme.colors.onSurface }}
							>
								Notifications
							</Text>
							<Text
								variant="bodySmall"
								style={[
									styles.settingDescription,
									{ color: theme.colors.outline },
								]}
							>
								Get notified about new activities
							</Text>
						</View>
						<Switch
							value={profile.notifications_enabled || false}
							onValueChange={(value) =>
								updatePreference("notifications_enabled", value)
							}
							color={theme.colors.primary}
						/>
					</View>

					<Divider style={styles.divider} />

					<View style={styles.settingRow}>
						<View style={styles.settingInfo}>
							<Text
								variant="bodyLarge"
								style={{ color: theme.colors.onSurface }}
							>
								Location Sharing
							</Text>
							<Text
								variant="bodySmall"
								style={[
									styles.settingDescription,
									{ color: theme.colors.outline },
								]}
							>
								Help find nearby users
							</Text>
						</View>
						<Switch
							value={profile.location_sharing || false}
							onValueChange={(value) =>
								updatePreference("location_sharing", value)
							}
							color={theme.colors.primary}
						/>
					</View>

					{profile.preferences &&
						Array.isArray(profile.preferences) &&
						profile.preferences.length > 0 && (
							<>
								<Divider style={styles.divider} />
								<Text
									variant="bodyLarge"
									style={{ color: theme.colors.onSurface }}
								>
									Preferences
								</Text>
								<View style={styles.preferenceTags}>
									{profile.preferences.map((pref, index) => (
										<Chip
											key={index}
											compact
											style={{ backgroundColor: theme.colors.primaryContainer }}
											textStyle={{ color: theme.colors.onPrimaryContainer }}
										>
											{pref}
										</Chip>
									))}
								</View>
							</>
						)}

					<Divider style={styles.divider} />

					<ThemeToggle />
				</Card.Content>
			</Card>

			{/* Actions */}
			<Card
				style={[styles.actionsCard, { backgroundColor: theme.colors.surface }]}
			>
				<Card.Content>
					<Button
						mode="outlined"
						onPress={() =>
							Alert.alert(
								"Coming Soon",
								"Profile editing will be available soon!"
							)
						}
						style={styles.actionButton}
						icon="pencil"
					>
						Edit Profile
					</Button>

					<Button
						mode="outlined"
						onPress={() =>
							Alert.alert("Coming Soon", "Settings will be available soon!")
						}
						style={styles.actionButton}
						icon="cog"
					>
						Settings
					</Button>

					<Button
						mode="outlined"
						onPress={() =>
							Alert.alert("Coming Soon", "Help center will be available soon!")
						}
						style={styles.actionButton}
						icon="help-circle"
					>
						Help & Support
					</Button>

					<Button
						mode="contained"
						onPress={handleSignOut}
						style={[styles.actionButton, styles.signOutButton]}
						buttonColor={theme.colors.error}
						textColor={theme.colors.onError}
					>
						Sign Out
					</Button>
				</Card.Content>
			</Card>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
	},
	profileHeader: {
		marginBottom: 16,
	},
	avatar: {
		alignSelf: "center",
		marginBottom: 16,
	},
	displayName: {
		textAlign: "center",
		marginBottom: 8,
	},
	badgeContainer: {
		alignItems: "center",
		marginBottom: 16,
	},
	badgeText: {
		fontWeight: "600",
	},
	bio: {
		textAlign: "center",
		fontStyle: "italic",
		marginTop: 8,
	},
	statsCard: {
		marginBottom: 16,
	},
	statsRow: {
		flexDirection: "row",
		justifyContent: "space-around",
	},
	statItem: {
		alignItems: "center",
	},
	settingsCard: {
		marginBottom: 16,
	},
	settingRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 8,
	},
	settingInfo: {
		flex: 1,
		marginRight: 16,
	},
	settingDescription: {
		marginTop: 4,
	},
	divider: {
		marginVertical: 16,
	},
	preferenceTags: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginTop: 8,
	},
	actionsCard: {
		marginBottom: 32,
	},
	actionButton: {
		marginBottom: 12,
	},
	signOutButton: {
		marginTop: 8,
	},
});
