// src/screens/dashboard/DashboardScreen.tsx - Updated without Quest system
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
	roomsJoined: number;
	nudgesSent: number;
	prayerPartners: number;
	careScore: number;
	currentStreak: number;
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
					roomsJoined: profile.rooms_participated || 0,
					nudgesSent: profile.nudges_sent || 0,
					prayerPartners: partnerships?.length || 0,
					careScore: profile.care_score || 0,
					currentStreak: profile.current_streak || 0,
				});
			}

			// Recent activity without quest references
			setRecentActivity([
				{
					id: "1",
					type: "prayer",
					title: "Prayer request answered",
					time: "1 hour ago",
				},
				{
					id: "2",
					type: "room",
					title: "Joined Morning Focus Room",
					time: "3 hours ago",
					participants: 4,
				},
				{
					id: "3",
					type: "nudge",
					title: "Sent encouraging nudge to Sarah",
					time: "Yesterday",
				},
				{
					id: "4",
					type: "prayer",
					title: "New prayer partner connected",
					time: "2 days ago",
				},
			]);
		} catch (error) {
			console.error("Error fetching dashboard data:", error);
		} finally {
			setLoading(false);
		}
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
				return "information";
		}
	};

	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.colors.background,
		},
		scrollContent: {
			padding: theme.spacing.md,
		},
		welcomeCard: {
			marginBottom: theme.spacing.lg,
			marginTop: 24,
			elevation: 2,
			backgroundColor: theme.colors.surface,
		},
		welcomeText: {
			fontSize: 24,
			fontWeight: "bold",
			color: theme.colors.onSurface,
			marginBottom: theme.spacing.sm,
		},
		welcomeSubtext: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 16,
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
		careScoreSection: {
			marginBottom: theme.spacing.lg,
		},
		careScoreHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: theme.spacing.sm,
		},
		careScoreText: {
			fontSize: 16,
			color: theme.colors.onSurface,
		},
		careScoreValue: {
			fontSize: 18,
			fontWeight: "bold",
			color: theme.colors.primary,
		},
		streakChip: {
			alignSelf: "flex-start",
			marginTop: theme.spacing.sm,
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
				<Text>Loading dashboard...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Welcome Card */}
				<Card style={styles.welcomeCard}>
					<Card.Content>
						<Text style={styles.welcomeText}>Welcome back, {userName}!</Text>
					</Card.Content>
				</Card>

				{/* Care Score Progress */}
				<Card style={styles.statsCard}>
					<Card.Content>
						<View style={styles.careScoreSection}>
							<View style={styles.careScoreHeader}>
								<Text style={styles.careScoreText}>Care Score</Text>
								<Text style={styles.careScoreValue}>{stats.careScore}/100</Text>
							</View>
							<ProgressBar
								progress={stats.careScore / 100}
								color={theme.colors.primary}
							/>
							{stats.currentStreak > 0 && (
								<Chip icon="fire" style={styles.streakChip}>
									{stats.currentStreak} day streak!
								</Chip>
							)}
						</View>
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

				{/* Quick Actions - Updated without Quest system */}
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
							<Button
								mode="outlined"
								style={styles.actionButton}
								onPress={() => navigation.navigate("Profile")}
								icon="account-edit"
							>
								Edit Profile
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
							recentActivity.map((item) => (
								<View key={item.id} style={styles.activityItem}>
									<MaterialCommunityIcons
										name={getActivityIcon(item.type) as any}
										size={20}
										color={theme.colors.primary}
										style={styles.activityIcon}
									/>
									<View style={styles.activityContent}>
										<Text style={styles.activityText}>{item.title}</Text>
										<Text style={styles.activityTime}>{item.time}</Text>
									</View>
									{item.participants && (
										<Text style={styles.activityTime}>
											{item.participants} people
										</Text>
									)}
								</View>
							))
						) : (
							<Text style={styles.emptyState}>
								Your activity will show up here as you connect with others
							</Text>
						)}
					</Card.Content>
				</Card>
			</ScrollView>
		</View>
	);
}
