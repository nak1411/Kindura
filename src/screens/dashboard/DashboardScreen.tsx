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
	careScore: number;
	currentStreak: number;
};

type RecentActivity = {
	id: string;
	type: "quest" | "room" | "nudge";
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
				setStats({
					questsCompleted: profile.quests_completed || 0,
					roomsJoined: profile.rooms_participated || 0,
					nudgesSent: profile.nudges_sent || 0,
					careScore: profile.care_score || 0,
					currentStreak: profile.current_streak || 0,
				});
			}

			// Mock recent activity - in a real app, you'd fetch this from your database
			setRecentActivity([
				{
					id: "1",
					type: "quest",
					title: "Completed Morning Reflection",
					time: "2 hours ago",
					participants: 3,
				},
				{
					id: "2",
					type: "room",
					title: "Joined Focus Room",
					time: "Yesterday",
					participants: 5,
				},
				{
					id: "3",
					type: "nudge",
					title: "Sent gentle nudge to Sarah",
					time: "2 days ago",
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
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.colors.outline,
		},
		activityIcon: {
			marginRight: 12,
		},
		activityContent: {
			flex: 1,
		},
		activityText: {
			color: theme.colors.onSurface,
			marginBottom: 2,
		},
		activityTime: {
			color: theme.colors.outline,
			fontSize: 12,
		},
		streakChip: {
			backgroundColor: theme.colors.primaryContainer,
			alignSelf: "center",
			marginTop: 8,
		},
	});

	if (loading) {
		return (
			<View
				style={[
					styles.container,
					{ justifyContent: "center", alignItems: "center" },
				]}
			>
				<Text>Loading...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<Surface style={styles.header}>
				<Text variant="headlineMedium" style={styles.welcomeMessage}>
					{getGreeting()}, {userName}
				</Text>
			</Surface>

			<ScrollView
				style={styles.container}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Care Score */}
				<Card style={styles.careScoreCard}>
					<Card.Content>
						<Text variant="titleLarge" style={styles.careScoreTitle}>
							Your Care Score
						</Text>
						<Text variant="headlineLarge" style={styles.careScoreValue}>
							{stats.careScore}
						</Text>
						<ProgressBar
							progress={stats.careScore / 100}
							style={styles.progressBar}
							color={theme.colors.primary}
						/>
						<Text variant="bodySmall" style={styles.progressText}>
							Keep spreading kindness to grow your score
						</Text>
						{stats.currentStreak > 0 && (
							<Chip
								icon="fire"
								style={styles.streakChip}
								textStyle={{ color: theme.colors.onPrimaryContainer }}
							>
								{stats.currentStreak} day streak
							</Chip>
						)}
					</Card.Content>
				</Card>

				{/* Stats Overview */}
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
								<Text style={styles.statNumber}>{stats.nudgesSent}</Text>
								<Text style={styles.statLabel}>Nudges</Text>
							</View>
							<View style={styles.statItem}>
								<Text style={styles.statNumber}>
									{stats.questsCompleted + stats.roomsJoined}
								</Text>
								<Text style={styles.statLabel}>Total{"\n"}Activities</Text>
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
								onPress={() => navigation.navigate("Quests")}
								icon="compass"
							>
								Find Quest
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
							<Button
								mode="outlined"
								style={styles.actionButton}
								onPress={() => navigation.navigate("Profile")}
								icon="account"
							>
								View Profile
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
							recentActivity.map((activity, index) => (
								<View
									key={activity.id}
									style={[
										styles.activityItem,
										index === recentActivity.length - 1 && {
											borderBottomWidth: 0,
										},
									]}
								>
									<MaterialCommunityIcons
										name={getActivityIcon(activity.type)}
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
											{activity.participants &&
												` • ${activity.participants} participants`}
										</Text>
									</View>
								</View>
							))
						) : (
							<Text
								variant="bodyMedium"
								style={[
									styles.activityText,
									{ textAlign: "center", fontStyle: "italic" },
								]}
							>
								No recent activity. Start your journey!
							</Text>
						)}
					</Card.Content>
				</Card>
			</ScrollView>
		</View>
	);
}
