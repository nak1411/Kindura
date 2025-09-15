import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
	Text,
	Card,
	Button,
	Avatar,
	Switch,
	Chip,
	Surface,
	Divider,
} from "react-native-paper";
import { supabase } from "../../services/supabase";
import { theme } from "../../constants/theme";
import { User } from "../../types";

export default function ProfileScreen() {
	const [user, setUser] = useState<User | null>(null);
	const [stats, setStats] = useState({
		questsCompleted: 0,
		roomsParticipated: 0,
		gatheringsAttended: 0,
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadUser();
		loadUserStats();
	}, []);

	const loadUser = async () => {
		try {
			const {
				data: { user: authUser },
			} = await supabase.auth.getUser();
			if (authUser) {
				const { data, error } = await supabase
					.from("users")
					.select("*")
					.eq("id", authUser.id)
					.single();

				if (error) throw error;
				setUser(data);
			}
		} catch (error) {
			console.error("Error loading user:", error);
			Alert.alert("Error", "Failed to load profile");
		} finally {
			setLoading(false);
		}
	};

	const loadUserStats = async () => {
		try {
			const {
				data: { user: authUser },
			} = await supabase.auth.getUser();
			if (!authUser) return;

			const { data: interactions, error } = await supabase
				.from("user_interactions")
				.select("interaction_type")
				.eq("user_id", authUser.id);

			if (error) throw error;

			const stats = {
				questsCompleted:
					interactions?.filter((i) => i.interaction_type === "quest_completed")
						.length || 0,
				roomsParticipated:
					interactions?.filter(
						(i) => i.interaction_type === "room_participated"
					).length || 0,
				gatheringsAttended:
					interactions?.filter(
						(i) => i.interaction_type === "gathering_attended"
					).length || 0,
			};

			setStats(stats);
		} catch (error) {
			console.error("Error loading stats:", error);
		}
	};

	const updateFaithMode = async (value: boolean) => {
		if (!user) return;

		try {
			const { error } = await supabase
				.from("users")
				.update({ faith_mode: value })
				.eq("id", user.id);

			if (error) throw error;
			setUser((prev) => (prev ? { ...prev, faith_mode: value } : null));
		} catch (error) {
			console.error("Error updating faith mode:", error);
			Alert.alert("Error", "Failed to update faith mode");
		}
	};

	const handleSignOut = async () => {
		Alert.alert("Sign Out", "Are you sure you want to sign out?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Sign Out",
				style: "destructive",
				onPress: async () => {
					const { error } = await supabase.auth.signOut();
					if (error) {
						Alert.alert("Error", error.message);
					}
				},
			},
		]);
	};

	const getCareScoreBadge = (score: number) => {
		if (score >= 50) return { label: "Caring Heart", icon: "💙" };
		if (score >= 25) return { label: "Kind Soul", icon: "💚" };
		if (score >= 10) return { label: "Gentle Spirit", icon: "🌸" };
		return { label: "New Friend", icon: "🌱" };
	};

	if (loading || !user) {
		return <View style={styles.container} />;
	}

	const badge = getCareScoreBadge(user.care_score);

	return (
		<ScrollView style={styles.container}>
			<Surface style={styles.profileHeader}>
				<Avatar.Text
					size={80}
					label={user.display_name.substring(0, 2).toUpperCase()}
					style={styles.avatar}
				/>
				<Text variant="headlineSmall" style={styles.displayName}>
					{user.display_name}
				</Text>
				<View style={styles.badgeContainer}>
					<Text variant="titleMedium" style={styles.badgeText}>
						{badge.icon} {badge.label}
					</Text>
					<Text variant="bodySmall" style={styles.careScore}>
						Care Score: {user.care_score}
					</Text>
				</View>
				{user.bio && (
					<Text variant="bodyMedium" style={styles.bio}>
						{user.bio}
					</Text>
				)}
			</Surface>

			<Card style={styles.statsCard}>
				<Card.Content>
					<Text variant="titleMedium" style={styles.statsTitle}>
						Your Journey
					</Text>
					<View style={styles.statsGrid}>
						<View style={styles.statItem}>
							<Text variant="headlineMedium" style={styles.statNumber}>
								{stats.questsCompleted}
							</Text>
							<Text variant="bodySmall" style={styles.statLabel}>
								Quests Completed
							</Text>
						</View>
						<View style={styles.statItem}>
							<Text variant="headlineMedium" style={styles.statNumber}>
								{stats.roomsParticipated}
							</Text>
							<Text variant="bodySmall" style={styles.statLabel}>
								Rooms Visited
							</Text>
						</View>
						<View style={styles.statItem}>
							<Text variant="headlineMedium" style={styles.statNumber}>
								{stats.gatheringsAttended}
							</Text>
							<Text variant="bodySmall" style={styles.statLabel}>
								Gatherings Joined
							</Text>
						</View>
					</View>
				</Card.Content>
			</Card>

			<Card style={styles.settingsCard}>
				<Card.Content>
					<Text variant="titleMedium" style={styles.settingsTitle}>
						Preferences
					</Text>

					<View style={styles.settingItem}>
						<View style={styles.settingText}>
							<Text variant="bodyMedium">Faith Mode</Text>
							<Text variant="bodySmall" style={styles.settingDescription}>
								Include spiritual content and prayer circles
							</Text>
						</View>
						<Switch value={user.faith_mode} onValueChange={updateFaithMode} />
					</View>

					<Divider style={styles.divider} />

					<View style={styles.settingItem}>
						<View style={styles.settingText}>
							<Text variant="bodyMedium">Communication Comfort</Text>
							<View style={styles.preferenceTags}>
								{user.preferences.voice_comfort && (
									<Chip compact mode="outlined" icon="microphone">
										Voice
									</Chip>
								)}
								{user.preferences.video_comfort && (
									<Chip compact mode="outlined" icon="video">
										Video
									</Chip>
								)}
							</View>
						</View>
					</View>

					{user.preferences.topics_to_avoid &&
						user.preferences.topics_to_avoid.length > 0 && (
							<>
								<Divider style={styles.divider} />
								<View style={styles.settingItem}>
									<View style={styles.settingText}>
										<Text variant="bodyMedium">Topics to Keep Gentle</Text>
										<View style={styles.preferenceTags}>
											{user.preferences.topics_to_avoid.map((topic, index) => (
												<Chip key={index} compact mode="outlined">
													{topic}
												</Chip>
											))}
										</View>
									</View>
								</View>
							</>
						)}
				</Card.Content>
			</Card>

			<Card style={styles.actionsCard}>
				<Card.Content>
					<Button
						mode="outlined"
						onPress={() =>
							Alert.alert("Coming Soon", "Edit profile will be available soon!")
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
		backgroundColor: theme.colors.background,
	},
	profileHeader: {
		alignItems: "center",
		padding: theme.spacing.lg,
		margin: theme.spacing.md,
		borderRadius: 16,
	},
	avatar: {
		backgroundColor: theme.colors.primary,
		marginBottom: theme.spacing.md,
	},
	displayName: {
		color: theme.colors.onSurface,
		marginBottom: theme.spacing.sm,
	},
	badgeContainer: {
		alignItems: "center",
		marginBottom: theme.spacing.md,
	},
	badgeText: {
		color: theme.colors.primary,
		marginBottom: theme.spacing.xs,
	},
	careScore: {
		color: theme.colors.outline,
	},
	bio: {
		textAlign: "center",
		color: theme.colors.onSurfaceVariant,
		lineHeight: 20,
	},
	statsCard: {
		margin: theme.spacing.md,
		marginTop: 0,
	},
	statsTitle: {
		color: theme.colors.primary,
		marginBottom: theme.spacing.md,
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
		color: theme.colors.primary,
		fontWeight: "bold",
	},
	statLabel: {
		color: theme.colors.outline,
		textAlign: "center",
		marginTop: theme.spacing.xs,
	},
	settingsCard: {
		margin: theme.spacing.md,
		marginTop: 0,
	},
	settingsTitle: {
		color: theme.colors.primary,
		marginBottom: theme.spacing.md,
	},
	settingItem: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: theme.spacing.md,
	},
	settingText: {
		flex: 1,
	},
	settingDescription: {
		color: theme.colors.outline,
		marginTop: theme.spacing.xs,
	},
	preferenceTags: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: theme.spacing.sm,
		marginTop: theme.spacing.sm,
	},
	divider: {
		marginVertical: theme.spacing.sm,
	},
	actionsCard: {
		margin: theme.spacing.md,
		marginTop: 0,
		marginBottom: theme.spacing.xl,
	},
	actionButton: {
		marginBottom: theme.spacing.md,
	},
	signOutButton: {
		marginTop: theme.spacing.md,
	},
});
