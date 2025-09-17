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
	quests_completed?: number;
	rooms_participated?: number;
	nudges_sent?: number;
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

			const { data, error } = await supabase
				.from("users")
				.select("*")
				.eq("id", user.id)
				.single();

			if (error) {
				console.error("Error fetching profile:", error);
				return;
			}

			setProfile({
				...data,
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
							New User
						</Text>
						<Text
							variant="bodyMedium"
							style={[styles.careScore, { color: theme.colors.outline }]}
						>
							Care Score: {profile.care_score}
						</Text>
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
						variant="titleLarge"
						style={[styles.statsTitle, { color: theme.colors.primary }]}
					>
						Your Journey
					</Text>
					<View style={styles.statsGrid}>
						<View style={styles.statItem}>
							<Text
								variant="headlineMedium"
								style={[styles.statNumber, { color: theme.colors.primary }]}
							>
								{profile.quests_completed || 0}
							</Text>
							<Text
								variant="bodySmall"
								style={[styles.statLabel, { color: theme.colors.outline }]}
							>
								Quests{"\n"}Completed
							</Text>
						</View>
						<View style={styles.statItem}>
							<Text
								variant="headlineMedium"
								style={[styles.statNumber, { color: theme.colors.primary }]}
							>
								{profile.rooms_participated || 0}
							</Text>
							<Text
								variant="bodySmall"
								style={[styles.statLabel, { color: theme.colors.outline }]}
							>
								Rooms{"\n"}Joined
							</Text>
						</View>
						<View style={styles.statItem}>
							<Text
								variant="headlineMedium"
								style={[styles.statNumber, { color: theme.colors.primary }]}
							>
								{profile.nudges_sent || 0}
							</Text>
							<Text
								variant="bodySmall"
								style={[styles.statLabel, { color: theme.colors.outline }]}
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
						variant="titleLarge"
						style={[styles.settingsTitle, { color: theme.colors.primary }]}
					>
						Settings
					</Text>

					{/* Theme Toggle */}
					<ThemeToggle />

					<Divider style={styles.divider} />

					<View style={styles.settingItem}>
						<View style={styles.settingText}>
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
								Receive reminders and updates
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

					<View style={styles.settingItem}>
						<View style={styles.settingText}>
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
	},
	profileHeader: {
		alignItems: "center",
		padding: 24,
		margin: 16,
		borderRadius: 8,
	},
	avatar: {
		marginBottom: 16,
		alignSelf: "center",
	},
	displayName: {
		marginBottom: 8,
		textAlign: "center",
	},
	badgeContainer: {
		alignItems: "center",
		marginBottom: 16,
	},
	badgeText: {
		marginBottom: 4,
	},
	careScore: {},
	bio: {
		textAlign: "center",
		lineHeight: 20,
	},
	statsCard: {
		margin: 16,
		marginTop: 0,
		borderRadius: 8,
	},
	statsTitle: {
		marginBottom: 16,
		textAlign: "center",
	},
	statsGrid: {
		flexDirection: "row",
		justifyContent: "space-around",
	},
	statItem: {
		alignItems: "center",
	},
	statNumber: {
		fontWeight: "bold",
	},
	statLabel: {
		textAlign: "center",
		marginTop: 4,
	},
	settingsCard: {
		margin: 16,
		marginTop: 0,
		borderRadius: 8,
	},
	settingsTitle: {
		marginBottom: 16,
	},
	settingItem: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 16,
	},
	settingText: {
		flex: 1,
	},
	settingDescription: {
		marginTop: 4,
	},
	preferenceTags: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginTop: 8,
	},
	divider: {
		marginVertical: 8,
	},
	actionsCard: {
		margin: 16,
		marginTop: 0,
		marginBottom: 32,
		borderRadius: 8,
	},
	actionButton: {
		marginBottom: 16,
		borderRadius: 8,
	},
	signOutButton: {
		marginTop: 16,
	},
});
