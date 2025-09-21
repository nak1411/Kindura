// src/screens/prayer/AllPrayerRequestsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import {
	Text,
	Card,
	Button,
	Avatar,
	Chip,
	Surface,
	IconButton,
	SegmentedButtons,
} from "react-native-paper";
import { supabase } from "../../services/supabase";
import { useTheme } from "../../constants/theme-context";
import { PrayerRequest, User } from "../../types";
import { PrayerPartnerService } from "../../services/PrayerPartnerService";

interface AllPrayerRequestsScreenProps {
	navigation: any;
}

export default function AllPrayerRequestsScreen({
	navigation,
}: AllPrayerRequestsScreenProps) {
	const { theme } = useTheme();

	// State
	const [user, setUser] = useState<User | null>(null);
	const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [filter, setFilter] = useState<"all" | "active" | "answered">("all");

	useEffect(() => {
		loadUser();
	}, []);

	useEffect(() => {
		if (user) {
			loadPrayerRequests();
		}
	}, [user, filter]);

	const loadUser = async () => {
		try {
			const {
				data: { user: authUser },
			} = await supabase.auth.getUser();
			if (authUser) {
				const { data } = await supabase
					.from("users")
					.select("*")
					.eq("id", authUser.id)
					.single();
				setUser(data);
			}
		} catch (error) {
			console.error("Error loading user:", error);
		}
	};

	const loadPrayerRequests = async () => {
		if (!user) return;

		setLoading(true);
		try {
			// First get the prayer requests
			let query = supabase
				.from("prayer_requests")
				.select("*")
				.or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
				.order("created_at", { ascending: false });

			if (filter !== "all") {
				query = query.eq("status", filter);
			}

			const { data: requests, error } = await query;
			if (error) throw error;

			if (!requests || requests.length === 0) {
				setPrayerRequests([]);
				return;
			}

			// Get all unique user IDs
			const userIds = new Set<string>();
			requests.forEach((r) => {
				userIds.add(r.from_user_id);
				userIds.add(r.to_user_id);
			});

			// Fetch user data separately
			const { data: users, error: usersError } = await supabase
				.from("users")
				.select("id, display_name")
				.in("id", Array.from(userIds));

			if (usersError) throw usersError;

			// Create a user lookup map
			const userMap = new Map();
			users?.forEach((user) => {
				userMap.set(user.id, user);
			});

			// Add user data to requests
			const requestsWithUsers = requests.map((request) => ({
				...request,
				from_user: userMap.get(request.from_user_id),
				to_user: userMap.get(request.to_user_id),
			}));

			setPrayerRequests(requestsWithUsers);
		} catch (error) {
			console.error("Error loading prayer requests:", error);
		} finally {
			setLoading(false);
		}
	};

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await loadPrayerRequests();
		setRefreshing(false);
	}, [loadPrayerRequests]);

	const renderPrayerRequest = ({ item }: { item: PrayerRequest }) => {
		const isFromMe = item.from_user_id === user?.id;
		const otherUser = isFromMe ? item.to_user : item.from_user;
		const canMarkAnswered = !isFromMe && item.status === "active";

		return (
			<Card
				style={[styles.requestCard, { backgroundColor: theme.colors.surface }]}
			>
				<Card.Content>
					<View style={styles.requestHeader}>
						<View style={styles.requestInfo}>
							<Avatar.Text
								size={40}
								label={otherUser?.display_name?.charAt(0).toUpperCase() || "?"}
								style={{ backgroundColor: theme.colors.secondaryContainer }}
							/>
							<View style={styles.requestDetails}>
								<Text variant="bodyMedium">
									{isFromMe
										? `To ${otherUser?.display_name}`
										: `From ${otherUser?.display_name}`}
								</Text>
								<Text
									variant="bodySmall"
									style={{ color: theme.colors.outline }}
								>
									{new Date(item.created_at).toLocaleDateString()} at{" "}
									{new Date(item.created_at).toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</Text>
							</View>
						</View>
						<View style={styles.statusChips}>
							{item.is_urgent && (
								<Chip
									mode="flat"
									textStyle={{ color: theme.colors.error }}
									style={{
										backgroundColor: theme.colors.errorContainer,
										marginBottom: 4,
									}}
									compact
								>
									Urgent
								</Chip>
							)}
							<Chip
								mode="outlined"
								textStyle={{
									color:
										item.status === "answered"
											? theme.colors.primary
											: theme.colors.outline,
								}}
								style={{
									borderColor:
										item.status === "answered"
											? theme.colors.primary
											: theme.colors.outline,
								}}
								compact
							>
								{item.status === "answered" ? "✓ Answered" : "Active"}
							</Chip>
						</View>
					</View>

					<Text variant="bodyMedium" style={styles.requestText}>
						{item.request_text}
					</Text>

					{item.answered_note && (
						<View style={styles.answerSection}>
							<Text
								variant="labelMedium"
								style={{ color: theme.colors.primary, marginBottom: 4 }}
							>
								How it was answered:
							</Text>
							<Text
								variant="bodySmall"
								style={{ color: theme.colors.onSurface }}
							>
								{item.answered_note}
							</Text>
						</View>
					)}

					{canMarkAnswered && (
						<View style={styles.requestActions}>
							<Button
								mode="outlined"
								onPress={() => {
									navigation.navigate("AnswerPrayer", { requestId: item.id });
								}}
								icon="check"
								compact
							>
								Mark as Answered
							</Button>
						</View>
					)}
				</Card.Content>
			</Card>
		);
	};

	const filteredCount = prayerRequests.length;
	const activeCount = prayerRequests.filter(
		(r) => r.status === "active"
	).length;
	const answeredCount = prayerRequests.filter(
		(r) => r.status === "answered"
	).length;

	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.colors.background,
		},
		header: {
			backgroundColor: theme.colors.surface,
			padding: 16,
			paddingTop: 40,
		},
		headerContent: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 16,
		},
		backButton: {
			marginRight: 8,
		},
		title: {
			color: theme.colors.onSurface,
			flex: 1,
		},
		filterContainer: {
			marginTop: 8,
		},
		statsRow: {
			flexDirection: "row",
			justifyContent: "space-around",
			marginTop: 12,
			paddingTop: 12,
			borderTopWidth: 1,
			borderTopColor: theme.colors.outline,
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
			fontSize: 12,
		},
		requestCard: {
			marginHorizontal: 16,
			marginBottom: 8,
		},
		requestHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
			marginBottom: 12,
		},
		requestInfo: {
			flexDirection: "row",
			alignItems: "center",
			flex: 1,
		},
		requestDetails: {
			marginLeft: 12,
			flex: 1,
		},
		statusChips: {
			alignItems: "flex-end",
		},
		requestText: {
			color: theme.colors.onSurface,
			marginBottom: 8,
		},
		answerSection: {
			backgroundColor: theme.colors.surfaceVariant,
			padding: 8,
			borderRadius: 4,
			marginBottom: 8,
		},
		requestActions: {
			marginTop: 8,
		},
		emptyState: {
			alignItems: "center",
			paddingVertical: 32,
			paddingHorizontal: 16,
		},
		emptyText: {
			color: theme.colors.outline,
			textAlign: "center",
			marginTop: 8,
		},
	});

	return (
		<View style={styles.container}>
			{/* Header */}
			<Surface style={styles.header}>
				<View style={styles.headerContent}>
					<IconButton
						icon="arrow-left"
						size={24}
						onPress={() => navigation.goBack()}
						style={styles.backButton}
					/>
					<Text variant="headlineSmall" style={styles.title}>
						All Prayer Requests
					</Text>
				</View>

				{/* Filter Buttons */}
				<SegmentedButtons
					value={filter}
					onValueChange={(value) =>
						setFilter(value as "all" | "active" | "answered")
					}
					buttons={[
						{ value: "all", label: `All (${filteredCount})` },
						{ value: "active", label: `Active (${activeCount})` },
						{ value: "answered", label: `Answered (${answeredCount})` },
					]}
					style={styles.filterContainer}
				/>

				{/* Stats Row */}
				<View style={styles.statsRow}>
					<View style={styles.statItem}>
						<Text variant="titleMedium" style={styles.statNumber}>
							{prayerRequests.length}
						</Text>
						<Text variant="bodySmall" style={styles.statLabel}>
							Total Requests
						</Text>
					</View>
					<View style={styles.statItem}>
						<Text variant="titleMedium" style={styles.statNumber}>
							{answeredCount}
						</Text>
						<Text variant="bodySmall" style={styles.statLabel}>
							Answered
						</Text>
					</View>
					<View style={styles.statItem}>
						<Text variant="titleMedium" style={styles.statNumber}>
							{Math.round(
								(answeredCount / Math.max(prayerRequests.length, 1)) * 100
							)}
							%
						</Text>
						<Text variant="bodySmall" style={styles.statLabel}>
							Answer Rate
						</Text>
					</View>
				</View>
			</Surface>

			{/* Prayer Requests List */}
			{prayerRequests.length > 0 ? (
				<FlatList
					data={prayerRequests}
					renderItem={renderPrayerRequest}
					keyExtractor={(item) => item.id}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
					}
					contentContainerStyle={{ paddingVertical: 16 }}
				/>
			) : (
				<View style={styles.emptyState}>
					<IconButton
						icon="hands-pray"
						size={48}
						iconColor={theme.colors.outline}
					/>
					<Text style={styles.emptyText}>
						{filter === "all"
							? "No prayer requests yet.\nConnect with prayer partners to start sharing requests."
							: filter === "active"
							? "No active prayer requests."
							: "No answered prayers yet."}
					</Text>
				</View>
			)}
		</View>
	);
}
