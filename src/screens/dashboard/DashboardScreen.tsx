// src/screens/dashboard/DashboardScreen.tsx - Updated with integrated profile editing
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
	Text,
	Card,
	Button,
	Surface,
	ProgressBar,
	Chip,
	Avatar,
	Divider,
	Switch,
	Modal,
	Portal,
	TextInput,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../services/supabase";
import { useTheme } from "../../constants/theme-context";
import { ThemeToggle } from "../../components/theme-toggle";

type DashboardStats = {
	roomsJoined: number;
	nudgesSent: number;
	prayerPartners: number;
	careScore: number;
	currentStreak: number;
};

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

type RecentActivity = {
	id: string;
	type: "room" | "nudge" | "prayer";
	title: string;
	time: string;
	participants?: number;
};

interface DashboardScreenProps {
	navigation: any;
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
	const [stats, setStats] = useState<DashboardStats>({
		roomsJoined: 0,
		nudgesSent: 0,
		prayerPartners: 0,
		careScore: 0,
		currentStreak: 0,
	});
	const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
	const [userName, setUserName] = useState<string>("Friend");
	const [profile, setProfile] = useState<Profile | null>(null);
	const [showProfileModal, setShowProfileModal] = useState(false);
	const [editingName, setEditingName] = useState("");
	const [editingBio, setEditingBio] = useState("");
	const [loading, setLoading] = useState(true);
	const { theme } = useTheme();

	useEffect(() => {
		fetchDashboardData();
	}, []);

	const fetchDashboardData = async () => {
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) return;

			// Fetch user profile
			const { data: profiles } = await supabase
				.from("users")
				.select("*")
				.eq("id", user.id);

			if (profiles && profiles.length > 0) {
				const profileData = {
					...profiles[0],
					email: user.email || "",
				};

				setProfile(profileData);
				setUserName(profileData.display_name || "Friend");
				setEditingName(profileData.display_name || "");
				setEditingBio(profileData.bio || "");

				// Count active prayer partnerships
				const { data: partnerships } = await supabase
					.from("prayer_partnerships")
					.select("id")
					.or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
					.eq("status", "active");

				setStats({
					roomsJoined: profileData.rooms_participated || 0,
					nudgesSent: profileData.nudges_sent || 0,
					prayerPartners: partnerships?.length || 0,
					careScore: profileData.care_score || 0,
					currentStreak: profileData.current_streak || 0,
				});
			}

			// Recent activity without quest references
			setRecentActivity([
				{
					id: "1",
					type: "prayer",
					title: "Connected with new prayer partner",
					time: "2 hours ago",
				},
				{
					id: "2",
					type: "room",
					title: "Joined evening prayer room",
					time: "Yesterday",
					participants: 12,
				},
				{
					id: "3",
					type: "nudge",
					title: "Sent encouragement to Sarah",
					time: "2 days ago",
				},
			]);
		} catch (error) {
			console.error("Error fetching dashboard data:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleSaveProfile = async () => {
		if (!profile) return;

		const { error } = await supabase
			.from("users")
			.update({
				display_name: editingName,
				bio: editingBio,
			})
			.eq("id", profile.id);

		if (error) {
			Alert.alert("Error", "Failed to update profile");
			return;
		}

		setProfile({
			...profile,
			display_name: editingName,
			bio: editingBio,
		});
		setUserName(editingName);
		setShowProfileModal(false);
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

	const handleSignOut = async () => {
		Alert.alert("Sign Out", "Are you sure you want to sign out?", [
			{ text: "Cancel", style: "cancel" },
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

	const getActivityIcon = (type: string) => {
		switch (type) {
			case "prayer":
				return "hands-pray";
			case "room":
				return "account-group";
			case "nudge":
				return "heart";
			default:
				return "circle";
		}
	};

	const styles = StyleSheet.create({
		container: {
			flex: 1,
			padding: theme.spacing.md,
			backgroundColor: theme.colors.background,
		},
		profileCard: {
			marginBottom: theme.spacing.lg,
			elevation: 2,
			backgroundColor: theme.colors.surface,
		},
		profileHeader: {
			gap: theme.spacing.sm,
		},
		profileContent: {
			flexDirection: "row",
			alignItems: "center",
		},
		avatar: {
			marginRight: theme.spacing.md,
		},
		profileInfo: {
			flex: 1,
		},
		editButton: {
			alignSelf: "flex-start",
		},
		editButtonLabel: {
			fontSize: 14,
		},
		welcomeText: {
			color: theme.colors.onSurface,
			marginBottom: theme.spacing.xs,
		},
		bio: {
			marginBottom: theme.spacing.sm,
			fontStyle: "italic",
		},
		badgeContainer: {
			flexDirection: "row",
			alignItems: "center",
			flexWrap: "wrap",
			gap: theme.spacing.sm,
		},
		careScore: {
			fontWeight: "600",
		},
		faithChip: {
			backgroundColor: theme.colors.primaryContainer,
		},
		statsCard: {
			marginBottom: theme.spacing.lg,
			elevation: 2,
			backgroundColor: theme.colors.surface,
		},
		statsTitle: {
			marginBottom: theme.spacing.md,
			color: theme.colors.primary,
		},
		statsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
		},
		statItem: {
			width: "50%",
			alignItems: "center",
			paddingVertical: theme.spacing.md,
		},
		statNumber: {
			fontSize: 32,
			fontWeight: "bold",
			color: theme.colors.primary,
			marginBottom: theme.spacing.xs,
		},
		statLabel: {
			fontSize: 12,
			color: theme.colors.onSurfaceVariant,
			textAlign: "center",
		},
		quickActionsCard: {
			marginBottom: theme.spacing.lg,
			elevation: 2,
			backgroundColor: theme.colors.surface,
		},
		quickActionsTitle: {
			marginBottom: theme.spacing.md,
			color: theme.colors.primary,
		},
		actionsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: theme.spacing.sm,
		},
		actionButton: {
			flex: 1,
			minWidth: "45%",
		},
		recentActivityCard: {
			marginBottom: theme.spacing.lg,
			elevation: 2,
			backgroundColor: theme.colors.surface,
		},
		activityTitle: {
			marginBottom: theme.spacing.md,
			color: theme.colors.primary,
		},
		activityItem: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: theme.spacing.sm,
			borderBottomWidth: 1,
			borderBottomColor: theme.colors.outline + "30",
		},
		activityIcon: {
			marginRight: theme.spacing.md,
		},
		activityContent: {
			flex: 1,
		},
		activityText: {
			fontSize: 14,
			color: theme.colors.onSurface,
			marginBottom: 2,
		},
		activityTime: {
			fontSize: 12,
			color: theme.colors.onSurfaceVariant,
		},
		emptyState: {
			textAlign: "center",
			color: theme.colors.onSurfaceVariant,
			fontStyle: "italic",
		},
		modalContainer: {
			margin: 20,
			padding: 24,
			borderRadius: 16,
			maxHeight: "90%",
		},
		modalHeader: {
			alignItems: "center",
			marginBottom: 32,
		},
		modalAvatar: {
			marginBottom: 16,
		},
		modalName: {
			textAlign: "center",
			fontWeight: "600",
			color: theme.colors.onSurface,
		},
		modalSection: {
			marginBottom: 24,
		},
		sectionTitle: {
			marginBottom: 16,
			fontWeight: "600",
			color: theme.colors.onSurface,
		},
		bioInput: {
			backgroundColor: "transparent",
		},
		bioInputContent: {
			paddingTop: 12,
		},
		preferenceItem: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
			paddingVertical: 16,
			borderBottomWidth: 1,
			borderBottomColor: theme.colors.outline + "20",
		},
		preferenceContent: {
			flex: 1,
			flexDirection: "row",
			alignItems: "center",
		},
		preferenceIcon: {
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: theme.colors.primaryContainer,
			justifyContent: "center",
			alignItems: "center",
			marginRight: 16,
		},
		preferenceText: {
			flex: 1,
		},
		preferenceTitle: {
			marginBottom: 4,
		},
		preferenceDescription: {
			lineHeight: 18,
		},
		themeContainer: {
			paddingVertical: 8,
		},
		modalActions: {
			gap: 12,
			marginBottom: 16,
		},
		saveButton: {
			paddingVertical: 8,
		},
		cancelButton: {
			paddingVertical: 8,
		},
		signOutButton: {
			alignSelf: "center",
			marginTop: 8,
		},
	});

	if (loading) {
		return (
			<View
				style={[styles.container, { backgroundColor: theme.colors.background }]}
			>
				<Text>Loading...</Text>
			</View>
		);
	}

	return (
		<SafeAreaView style={styles.container} edges={["top"]}>
			<ScrollView showsVerticalScrollIndicator={false}>
				{/* User Profile Header */}
				{profile && (
					<Card style={styles.profileCard}>
						<Card.Content>
							<View style={styles.profileHeader}>
								<View style={styles.profileContent}>
									<Avatar.Text
										size={60}
										label={profile.display_name.charAt(0).toUpperCase()}
										style={[
											styles.avatar,
											{ backgroundColor: theme.colors.primary },
										]}
									/>
									<View style={styles.profileInfo}>
										<Text variant="titleLarge" style={styles.welcomeText}>
											Welcome back, {userName}!
										</Text>
										{profile.bio && (
											<Text
												variant="bodyMedium"
												style={[
													styles.bio,
													{ color: theme.colors.onSurfaceVariant },
												]}
											>
												{profile.bio}
											</Text>
										)}
										<View style={styles.badgeContainer}>
											<Text
												variant="bodyLarge"
												style={[
													styles.careScore,
													{ color: theme.colors.primary },
												]}
											>
												Care Score: {profile.care_score}
											</Text>
										</View>
									</View>
								</View>
								<Button
									mode="text"
									onPress={() => setShowProfileModal(true)}
									icon="pencil"
									style={styles.editButton}
									labelStyle={styles.editButtonLabel}
								>
									Edit Profile
								</Button>
							</View>
						</Card.Content>
					</Card>
				)}

				{/* Statistics Grid */}
				<Card style={styles.statsCard}>
					<Card.Content>
						<Text variant="titleLarge" style={styles.statsTitle}>
							Your Journey
						</Text>
						<View style={styles.statsGrid}>
							<View style={styles.statItem}>
								<Text style={styles.statNumber}>{stats.roomsJoined}</Text>
								<Text style={styles.statLabel}>Rooms{"\n"}Joined</Text>
							</View>
							<View style={styles.statItem}>
								<Text style={styles.statNumber}>{stats.prayerPartners}</Text>
								<Text style={styles.statLabel}>Prayer{"\n"}Partners</Text>
							</View>
							<View style={styles.statItem}>
								<Text style={styles.statNumber}>{stats.nudgesSent}</Text>
								<Text style={styles.statLabel}>Nudges{"\n"}Sent</Text>
							</View>
							<View style={styles.statItem}>
								<Text style={styles.statNumber}>{stats.careScore}</Text>
								<Text style={styles.statLabel}>Care{"\n"}Score</Text>
							</View>
						</View>
					</Card.Content>
				</Card>

				{/* Quick Actions */}
				<Card style={styles.quickActionsCard}>
					<Card.Content>
						<Text variant="titleLarge" style={styles.quickActionsTitle}>
							Quick Actions
						</Text>
						<View style={styles.actionsGrid}>
							<Button
								mode="contained"
								style={styles.actionButton}
								onPress={() => navigation.navigate("Prayer")}
								icon="hands-pray"
							>
								Prayer Partners
							</Button>
							<Button
								mode="contained"
								style={styles.actionButton}
								onPress={() => navigation.navigate("Rooms")}
								icon="account-group"
							>
								Join Room
							</Button>
							<Button
								mode="outlined"
								style={styles.actionButton}
								onPress={() => navigation.navigate("Map")}
								icon="map-marker"
							>
								Explore Map
							</Button>
						</View>
					</Card.Content>
				</Card>

				{/* Recent Activity */}
				<Card style={styles.recentActivityCard}>
					<Card.Content>
						<Text variant="titleLarge" style={styles.activityTitle}>
							Recent Activity
						</Text>
						{recentActivity.length > 0 ? (
							recentActivity.map((activity) => (
								<View key={activity.id} style={styles.activityItem}>
									<MaterialCommunityIcons
										name={getActivityIcon(activity.type) as any}
										size={24}
										color={theme.colors.primary}
										style={styles.activityIcon}
									/>
									<View style={styles.activityContent}>
										<Text style={styles.activityText}>{activity.title}</Text>
										<Text style={styles.activityTime}>{activity.time}</Text>
									</View>
								</View>
							))
						) : (
							<Text style={styles.emptyState}>No recent activity</Text>
						)}
					</Card.Content>
				</Card>

				{/* Profile Edit Modal */}
				<Portal>
					<Modal
						visible={showProfileModal}
						onDismiss={() => setShowProfileModal(false)}
						contentContainerStyle={[
							styles.modalContainer,
							{ backgroundColor: theme.colors.surface },
						]}
					>
						<ScrollView showsVerticalScrollIndicator={false}>
							<View style={styles.modalHeader}>
								<Avatar.Text
									size={80}
									label={profile?.display_name.charAt(0).toUpperCase() || "U"}
									style={[
										styles.modalAvatar,
										{ backgroundColor: theme.colors.primary },
									]}
								/>
								<Text variant="headlineSmall" style={styles.modalName}>
									{profile?.display_name}
								</Text>
							</View>

							<View style={styles.modalSection}>
								<Text variant="titleMedium" style={styles.sectionTitle}>
									Bio
								</Text>
								<TextInput
									value={editingBio}
									onChangeText={setEditingBio}
									style={styles.bioInput}
									mode="outlined"
									placeholder="Tell others about yourself..."
									multiline
									numberOfLines={4}
									contentStyle={styles.bioInputContent}
								/>
							</View>

							{profile && (
								<View style={styles.modalSection}>
									<Text variant="titleMedium" style={styles.sectionTitle}>
										Preferences
									</Text>

									<View style={styles.preferenceItem}>
										<View style={styles.preferenceContent}>
											<View style={styles.preferenceIcon}>
												<MaterialCommunityIcons
													name="bell"
													size={24}
													color={theme.colors.primary}
												/>
											</View>
											<View style={styles.preferenceText}>
												<Text
													variant="bodyLarge"
													style={styles.preferenceTitle}
												>
													Notifications
												</Text>
												<Text
													variant="bodySmall"
													style={[
														styles.preferenceDescription,
														{ color: theme.colors.outline },
													]}
												>
													Get notified about activities and prayer requests
												</Text>
											</View>
										</View>
										<Switch
											value={profile.notifications_enabled || false}
											onValueChange={(value) =>
												updatePreference("notifications_enabled", value)
											}
											color={theme.colors.primary}
										/>
									</View>

									<View style={styles.preferenceItem}>
										<View style={styles.preferenceContent}>
											<View style={styles.preferenceIcon}>
												<MaterialCommunityIcons
													name="map-marker"
													size={24}
													color={theme.colors.primary}
												/>
											</View>
											<View style={styles.preferenceText}>
												<Text
													variant="bodyLarge"
													style={styles.preferenceTitle}
												>
													Location Sharing
												</Text>
												<Text
													variant="bodySmall"
													style={[
														styles.preferenceDescription,
														{ color: theme.colors.outline },
													]}
												>
													Help others find nearby prayer partners
												</Text>
											</View>
										</View>
										<Switch
											value={profile.location_sharing || false}
											onValueChange={(value) =>
												updatePreference("location_sharing", value)
											}
											color={theme.colors.primary}
										/>
									</View>
								</View>
							)}

							<View style={styles.modalSection}>
								<Text variant="titleMedium" style={styles.sectionTitle}>
									Theme
								</Text>
								<View style={styles.themeContainer}>
									<ThemeToggle />
								</View>
							</View>

							<View style={styles.modalActions}>
								<Button
									mode="contained"
									onPress={handleSaveProfile}
									style={[
										styles.saveButton,
										{ backgroundColor: theme.colors.primary },
									]}
									labelStyle={{ color: theme.colors.onPrimary }}
								>
									Save Changes
								</Button>
								<Button
									mode="outlined"
									onPress={() => setShowProfileModal(false)}
									style={styles.cancelButton}
								>
									Cancel
								</Button>
							</View>

							<Button
								mode="text"
								onPress={handleSignOut}
								style={styles.signOutButton}
								labelStyle={{ color: theme.colors.error }}
								icon="logout"
							>
								Sign Out
							</Button>
						</ScrollView>
					</Modal>
				</Portal>
			</ScrollView>
		</SafeAreaView>
	);
}
