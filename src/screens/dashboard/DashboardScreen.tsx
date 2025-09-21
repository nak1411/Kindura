// src/screens/dashboard/DashboardScreen.tsx - Updated with Prayer Partners
import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
	Text,
	Card,
	Button,
	Surface,
	ProgressBar,
	Chip,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../services/supabase";
import { useTheme } from "../../constants/theme-context";

type DashboardStats = {
	questsCompleted: number;
	roomsJoined: number;
	nudgesSent: number;
	prayerPartners: number; // NEW
	careScore: number;
	currentStreak: number;
};

type RecentActivity = {
	id: string;
	type: "quest" | "room" | "nudge" | "prayer"; // Added prayer type
	title: string;
	time: string;
	participants?: number;
};

interface DashboardScreenProps {
	navigation: any;
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
	const [stats, setStats] = useState<DashboardStats>({
		questsCompleted: 0,
		roomsJoined: 0,
		nudgesSent: 0,
		prayerPartners: 0, // NEW
		careScore: 0,
		currentStreak: 0,
	});
	const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
	const [userName, setUserName] = useState<string>("Friend");
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
			const { data: profile } = await supabase
				.from("users")
				.select("*")
				.eq("id", user.id)
				.single();

			if (profile) {
				setUserName(profile.display_name || "Friend");

				// Count active prayer partnerships
				const { data: partnerships } = await supabase
					.from("prayer_partnerships")
					.select("id")
					.or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
					.eq("status", "active");

				setStats({
					questsCompleted: profile.quests_completed || 0,
					roomsJoined: profile.rooms_participated || 0,
					nudgesSent: profile.nudges_sent || 0,
					prayerPartners: partnerships?.length || 0, // NEW
					careScore: profile.care_score || 0,
					currentStreak: profile.current_streak || 0,
				});
			}

			// Enhanced recent activity with prayer activities
			setRecentActivity([
				{
					id: "1",
					type: "prayer",
					title: "Prayer request answered",
					time: "1 hour ago",
				},
				{
					id: "2",
					type: "quest",
					title: "Completed Morning Reflection",
					time: "2 hours ago",
					participants: 3,
				},
				{
					id: "3",
					type: "room",
					title: "Joined Focus Room",
					time: "Yesterday",
					participants: 5,
				},
				{
					id: "4",
					type: "prayer",
					title: "Daily check-in with Sarah",
					time: "Yesterday",
				},
			]);
		} catch (error) {
			console.error("Error fetching dashboard data:", error);
		} finally {
			setLoading(false);
		}
	};

	const getGreeting = () => {
		const hour = new Date().getHours();
		if (hour < 12) return "Good morning";
		if (hour < 17) return "Good afternoon";
		return "Good evening";
	};

	const getActivityIcon = (type: string) => {
		switch (type) {
			case "quest":
				return "compass";
			case "room":
				return "account-group";
			case "nudge":
				return "heart";
			case "prayer": // NEW
				return "hands-pray";
			default:
				return "circle";
		}
	};

	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.colors.background,
		},
		header: {
			backgroundColor: theme.colors.surface,
			elevation: 4,
			paddingTop: 40,
			paddingBottom: 16,
			paddingHorizontal: 16,
		},
		greeting: {
			color: theme.colors.outline,
			marginBottom: 4,
		},
		welcomeMessage: {
			color: theme.colors.primary,
			fontWeight: "bold",
		},
		scrollContent: {
			padding: 16,
		},
		statsCard: {
			backgroundColor: theme.colors.surface,
			marginBottom: 16,
			borderRadius: 8,
			elevation: 2,
		},
		statsTitle: {
			color: theme.colors.primary,
			marginBottom: 16,
			textAlign: "center",
		},
		statsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			justifyContent: "space-between",
		},
		statItem: {
			alignItems: "center",
			width: "48%",
			marginBottom: 16,
		},
		statNumber: {
			color: theme.colors.primary,
			fontWeight: "bold",
			fontSize: 24,
		},
		statLabel: {
			color: theme.colors.outline,
			textAlign: "center",
			marginTop: 4,
			fontSize: 12,
		},
		careScoreCard: {
			backgroundColor: theme.colors.surface,
			marginBottom: 16,
			borderRadius: 8,
			elevation: 2,
		},
		careScoreTitle: {
			color: theme.colors.primary,
			marginBottom: 8,
		},
		careScoreValue: {
			color: theme.colors.primary,
			fontWeight: "bold",
			textAlign: "center",
			marginBottom: 8,
		},
		progressBar: {
			height: 8,
			borderRadius: 4,
			marginBottom: 8,
		},
		progressText: {
			color: theme.colors.outline,
			textAlign: "center",
			fontSize: 12,
		},
		quickActionsCard: {
			backgroundColor: theme.colors.surface,
			marginBottom: 16,
			borderRadius: 8,
			elevation: 2,
		},
		quickActionsTitle: {
			color: theme.colors.primary,
			marginBottom: 16,
		},
		actionsGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			justifyContent: "space-between",
		},
		actionButton: {
			width: "48%",
			marginBottom: 12,
			borderRadius: 8,
		},
		recentActivityCard: {
			backgroundColor: theme.colors.surface,
			marginBottom: 16,
			borderRadius: 8,
			elevation: 2,
		},
		activityTitle: {
			color: theme.colors.primary,
			marginBottom: 16,
		},
		activityItem: {
			flexDirection: "row",
			alignItems: "center",
			paddingVertical: 8,
		},
		activityIcon: {
			marginRight: 12,
		},
		activityContent: {
			flex: 1,
		},
		activityText: {
			color: theme.colors.onSurface,
		},
		activityTime: {
			color: theme.colors.outline,
			fontSize: 12,
		},
		activityParticipants: {
			color: theme.colors.outline,
			fontSize: 12,
		},
	});

	return (
		<View style={styles.container}>
			{/* Header */}
			<Surface style={styles.header}>
				<Text variant="bodyMedium" style={styles.greeting}>
					{getGreeting()},
				</Text>
				<Text variant="headlineMedium" style={styles.welcomeMessage}>
					{userName}! ✨
				</Text>
			</Surface>

			<ScrollView style={styles.scrollContent}>
				{/* Care Score Progress */}
				<Card style={styles.careScoreCard}>
					<Card.Content>
						<Text variant="titleLarge" style={styles.careScoreTitle}>
							Care Score
						</Text>
						<Text variant="headlineLarge" style={styles.careScoreValue}>
							{stats.careScore}
						</Text>
						<ProgressBar
							progress={stats.careScore / 100}
							color={theme.colors.primary}
							style={styles.progressBar}
						/>
						<Text variant="bodySmall" style={styles.progressText}>
							Keep connecting to grow your care score!
						</Text>
					</Card.Content>
				</Card>

				{/* Statistics Grid */}
				<Card style={styles.statsCard}>
					<Card.Content>
						<Text variant="titleLarge" style={styles.statsTitle}>
							Your Journey
						</Text>
						<View style={styles.statsGrid}>
							<View style={styles.statItem}>
								<Text style={styles.statNumber}>{stats.questsCompleted}</Text>
								<Text style={styles.statLabel}>Quests{"\n"}Completed</Text>
							</View>
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
						</View>
					</Card.Content>
				</Card>

				{/* Quick Actions - Updated with Prayer Partners */}
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
								onPress={() => navigation.navigate("Quests")}
								icon="compass"
							>
								Find Quest
							</Button>
							<Button
								mode="outlined"
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
										<Text variant="bodyMedium" style={styles.activityText}>
											{activity.title}
										</Text>
										<Text variant="bodySmall" style={styles.activityTime}>
											{activity.time}
											{activity.participants && (
												<Text style={styles.activityParticipants}>
													{" "}
													• {activity.participants} participants
												</Text>
											)}
										</Text>
									</View>
								</View>
							))
						) : (
							<Text variant="bodyMedium" style={styles.activityTime}>
								No recent activity. Start your journey today!
							</Text>
						)}
					</Card.Content>
				</Card>
			</ScrollView>
		</View>
	);
}
