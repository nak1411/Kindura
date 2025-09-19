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

			// Fetch user profile - use array query instead of .single() to avoid PGRST116 error
			const { data: profiles, error } = await supabase
				.from("users")
				.select("*")
				.eq("id", user.id);

			if (error) {
				console.error("Error fetching dashboard data:", error);
			} else if (profiles && profiles.length > 0) {
				const profile = profiles[0];
				setUserName(profile.display_name || "Friend");
				setStats({
					questsCompleted: 0, // These fields don't exist in DB yet
					roomsJoined: 0,
					nudgesSent: 0,
					careScore: profile.care_score || 0,
					currentStreak: 0,
				});
			} else {
				console.log("No profile found for user:", user.id);
				// User might not have completed onboarding yet
				setUserName("Friend");
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

	const getActivityColor = (type: string) => {
		switch (type) {
			case "quest":
				return theme.colors.primary;
			case "room":
				return theme.colors.secondary;
			case "nudge":
				return theme.colors.tertiary;
			default:
				return theme.colors.outline;
		}
	};

	if (loading) {
		return (
			<View
				style={[
					styles.container,
					styles.centered,
					{ backgroundColor: theme.colors.background },
				]}
			>
				<Text style={{ color: theme.colors.onBackground }}>
					Loading your dashboard...
				</Text>
			</View>
		);
	}

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: theme.colors.background }]}
		>
			{/* Welcome Section */}
			<Surface
				style={[styles.welcomeCard, { backgroundColor: theme.colors.surface }]}
			>
				<Text
					variant="headlineSmall"
					style={[styles.greeting, { color: theme.colors.onSurface }]}
				>
					{getGreeting()}, {userName}! 🌟
				</Text>
				<Text
					variant="bodyMedium"
					style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
				>
					Ready to spread some kindness today?
				</Text>
			</Surface>

			{/* Stats Overview */}
			<Card
				style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}
			>
				<Card.Content>
					<Text
						variant="titleMedium"
						style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
					>
						Your Impact
					</Text>

					<View style={styles.statsGrid}>
						<View style={styles.statItem}>
							<MaterialCommunityIcons
								name="compass"
								size={24}
								color={theme.colors.primary}
							/>
							<Text
								variant="headlineSmall"
								style={[styles.statNumber, { color: theme.colors.primary }]}
							>
								{stats.questsCompleted}
							</Text>
							<Text
								variant="bodySmall"
								style={[
									styles.statLabel,
									{ color: theme.colors.onSurfaceVariant },
								]}
							>
								Quests
							</Text>
						</View>

						<View style={styles.statItem}>
							<MaterialCommunityIcons
								name="account-group"
								size={24}
								color={theme.colors.secondary}
							/>
							<Text
								variant="headlineSmall"
								style={[styles.statNumber, { color: theme.colors.secondary }]}
							>
								{stats.roomsJoined}
							</Text>
							<Text
								variant="bodySmall"
								style={[
									styles.statLabel,
									{ color: theme.colors.onSurfaceVariant },
								]}
							>
								Rooms
							</Text>
						</View>

						<View style={styles.statItem}>
							<MaterialCommunityIcons
								name="heart"
								size={24}
								color={theme.colors.tertiary}
							/>
							<Text
								variant="headlineSmall"
								style={[styles.statNumber, { color: theme.colors.tertiary }]}
							>
								{stats.nudgesSent}
							</Text>
							<Text
								variant="bodySmall"
								style={[
									styles.statLabel,
									{ color: theme.colors.onSurfaceVariant },
								]}
							>
								Nudges
							</Text>
						</View>
					</View>

					{/* Care Score */}
					<View style={styles.careScoreSection}>
						<View style={styles.careScoreHeader}>
							<Text
								variant="bodyLarge"
								style={{ color: theme.colors.onSurface }}
							>
								Care Score
							</Text>
							<Chip
								mode="flat"
								compact
								style={{ backgroundColor: theme.colors.primaryContainer }}
								textStyle={{ color: theme.colors.onPrimaryContainer }}
							>
								{stats.careScore}/100
							</Chip>
						</View>
						<ProgressBar
							progress={stats.careScore / 100}
							color={theme.colors.primary}
							style={styles.progressBar}
						/>
						<Text
							variant="bodySmall"
							style={[
								styles.progressText,
								{ color: theme.colors.onSurfaceVariant },
							]}
						>
							Keep going! Small acts of kindness make a big difference.
						</Text>
					</View>
				</Card.Content>
			</Card>

			{/* Recent Activity */}
			<Card
				style={[styles.activityCard, { backgroundColor: theme.colors.surface }]}
			>
				<Card.Content>
					<Text
						variant="titleMedium"
						style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
					>
						Recent Activity
					</Text>

					{recentActivity.length > 0 ? (
						recentActivity.map((activity) => (
							<View key={activity.id} style={styles.activityItem}>
								<MaterialCommunityIcons
									name={getActivityIcon(activity.type)}
									size={20}
									color={getActivityColor(activity.type)}
									style={styles.activityIcon}
								/>
								<View style={styles.activityContent}>
									<Text
										variant="bodyMedium"
										style={{ color: theme.colors.onSurface }}
									>
										{activity.title}
									</Text>
									<Text
										variant="bodySmall"
										style={{ color: theme.colors.onSurfaceVariant }}
									>
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
								styles.emptyText,
								{ color: theme.colors.onSurfaceVariant },
							]}
						>
							No recent activity. Start your kindness journey today!
						</Text>
					)}
				</Card.Content>
			</Card>

			{/* Quick Actions */}
			<Card
				style={[styles.actionsCard, { backgroundColor: theme.colors.surface }]}
			>
				<Card.Content>
					<Text
						variant="titleMedium"
						style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
					>
						Quick Actions
					</Text>

					<View style={styles.actionButtons}>
						<Button
							mode="contained"
							onPress={() => navigation.navigate("Quests")}
							style={[
								styles.actionButton,
								{ backgroundColor: theme.colors.primary },
							]}
							icon="compass"
						>
							Find Quests
						</Button>

						<Button
							mode="outlined"
							onPress={() => navigation.navigate("Rooms")}
							style={styles.actionButton}
							icon="account-group"
						>
							Join Room
						</Button>

						<Button
							mode="outlined"
							onPress={() => navigation.navigate("Map")}
							style={styles.actionButton}
							icon="map-marker"
						>
							Explore Map
						</Button>
					</View>
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
	centered: {
		justifyContent: "center",
		alignItems: "center",
	},
	welcomeCard: {
		padding: 20,
		marginBottom: 16,
		borderRadius: 12,
	},
	greeting: {
		fontWeight: "600",
		marginBottom: 4,
	},
	subtitle: {
		lineHeight: 20,
	},
	statsCard: {
		marginBottom: 16,
	},
	sectionTitle: {
		fontWeight: "600",
		marginBottom: 16,
	},
	statsGrid: {
		flexDirection: "row",
		justifyContent: "space-around",
		marginBottom: 24,
	},
	statItem: {
		alignItems: "center",
		flex: 1,
	},
	statNumber: {
		fontWeight: "700",
		marginTop: 8,
		marginBottom: 4,
	},
	statLabel: {
		fontSize: 12,
	},
	careScoreSection: {
		marginTop: 8,
	},
	careScoreHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	progressBar: {
		height: 8,
		borderRadius: 4,
		marginBottom: 8,
	},
	progressText: {
		textAlign: "center",
		fontStyle: "italic",
	},
	activityCard: {
		marginBottom: 16,
	},
	activityItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(0,0,0,0.05)",
	},
	activityIcon: {
		marginRight: 12,
	},
	activityContent: {
		flex: 1,
	},
	emptyText: {
		textAlign: "center",
		fontStyle: "italic",
		paddingVertical: 16,
	},
	actionsCard: {
		marginBottom: 32,
	},
	actionButtons: {
		gap: 12,
	},
	actionButton: {
		marginBottom: 8,
	},
});
