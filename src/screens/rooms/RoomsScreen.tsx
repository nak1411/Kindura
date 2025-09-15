import React, { useState, useEffect } from "react";
import {
	View,
	StyleSheet,
	FlatList,
	RefreshControl,
	Alert,
} from "react-native";
import {
	Text,
	Card,
	Button,
	Avatar,
	Chip,
	ProgressBar,
} from "react-native-paper";
import { supabase } from "../../services/supabase";
import { theme } from "../../constants/theme";
import { ParallelRoom, User } from "../../types";

export default function RoomsScreen() {
	const [rooms, setRooms] = useState<ParallelRoom[]>([]);
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [joinedRoom, setJoinedRoom] = useState<string | null>(null);

	useEffect(() => {
		loadUser();
		loadRooms();

		// Set up real-time subscription for room updates
		const subscription = supabase
			.channel("parallel_rooms")
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "parallel_rooms",
				},
				() => {
					loadRooms();
				}
			)
			.subscribe();

		return () => {
			subscription.unsubscribe();
		};
	}, []);

	const loadUser = async () => {
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
	};

	const loadRooms = async () => {
		setLoading(true);
		try {
			let query = supabase
				.from("parallel_rooms")
				.select("*")
				.eq("is_active", true);

			// Filter by faith mode if user has it disabled
			if (user && !user.faith_mode) {
				query = query.eq("faith_content", false);
			}

			const { data, error } = await query.order("created_at", {
				ascending: false,
			});

			if (error) throw error;
			setRooms(data || []);

			// Check if user is in any room
			const userInRoom = data?.find((room) =>
				room.current_participants.includes(user?.id || "")
			);
			setJoinedRoom(userInRoom?.id || null);
		} catch (error) {
			console.error("Error loading rooms:", error);
			Alert.alert("Error", "Failed to load rooms");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	const onRefresh = () => {
		setRefreshing(true);
		loadRooms();
	};

	const joinRoom = async (room: ParallelRoom) => {
		if (!user || room.current_participants.includes(user.id)) return;

		if (room.current_participants.length >= room.max_capacity) {
			Alert.alert(
				"Room Full",
				"This room is at capacity. Please try another room."
			);
			return;
		}

		try {
			const updatedParticipants = [...room.current_participants, user.id];

			const { error } = await supabase
				.from("parallel_rooms")
				.update({
					current_participants: updatedParticipants,
				})
				.eq("id", room.id);

			if (error) throw error;

			setJoinedRoom(room.id);
			Alert.alert(
				"Welcome!",
				`You've joined ${room.name}. Take your time and enjoy the gentle presence.`
			);
		} catch (error) {
			console.error("Error joining room:", error);
			Alert.alert("Error", "Failed to join room");
		}
	};

	const leaveRoom = async (roomId: string) => {
		if (!user) return;

		try {
			const room = rooms.find((r) => r.id === roomId);
			if (!room) return;

			const updatedParticipants = room.current_participants.filter(
				(id) => id !== user.id
			);

			const { error } = await supabase
				.from("parallel_rooms")
				.update({
					current_participants: updatedParticipants,
				})
				.eq("id", roomId);

			if (error) throw error;

			setJoinedRoom(null);

			// Record interaction for care score
			await supabase.from("user_interactions").insert({
				user_id: user.id,
				interaction_type: "room_participated",
				points: 1,
			});
		} catch (error) {
			console.error("Error leaving room:", error);
			Alert.alert("Error", "Failed to leave room");
		}
	};

	const getRoomIcon = (roomType: string) => {
		switch (roomType) {
			case "focus":
				return "🎯";
			case "walk":
				return "🚶";
			case "read":
				return "📚";
			case "create":
				return "🎨";
			case "pray":
				return "🙏";
			default:
				return "✨";
		}
	};

	const renderRoom = ({ item }: { item: ParallelRoom }) => {
		const isUserInRoom = item.current_participants.includes(user?.id || "");
		const occupancy = item.current_participants.length / item.max_capacity;

		return (
			<Card style={[styles.roomCard, isUserInRoom && styles.activeRoomCard]}>
				<Card.Content>
					<View style={styles.roomHeader}>
						<Text variant="titleMedium" style={styles.roomTitle}>
							{getRoomIcon(item.room_type)} {item.name}
						</Text>
						<View style={styles.occupancyInfo}>
							<Text variant="bodySmall" style={styles.occupancyText}>
								{item.current_participants.length}/{item.max_capacity}
							</Text>
						</View>
					</View>

					{item.description && (
						<Text variant="bodyMedium" style={styles.roomDescription}>
							{item.description}
						</Text>
					)}

					<ProgressBar
						progress={occupancy}
						color={occupancy > 0.8 ? theme.colors.error : theme.colors.primary}
						style={styles.occupancyBar}
					/>

					{item.prompt_of_moment && (
						<View style={styles.promptContainer}>
							<Text variant="bodySmall" style={styles.promptLabel}>
								Moment's reflection:
							</Text>
							<Text variant="bodySmall" style={styles.promptText}>
								{item.prompt_of_moment}
							</Text>
						</View>
					)}

					<View style={styles.roomFooter}>
						<View style={styles.roomTags}>
							<Chip compact mode="outlined" icon="volume-medium">
								{item.ambient_sound || "quiet"}
							</Chip>
							{item.faith_content && (
								<Chip compact mode="outlined" icon="heart">
									Faith
								</Chip>
							)}
						</View>

						<Button
							mode={isUserInRoom ? "outlined" : "contained"}
							onPress={() =>
								isUserInRoom ? leaveRoom(item.id) : joinRoom(item)
							}
							disabled={
								!isUserInRoom &&
								item.current_participants.length >= item.max_capacity
							}
						>
							{isUserInRoom ? "Leave" : "Join"}
						</Button>
					</View>
				</Card.Content>
			</Card>
		);
	};

	return (
		<View style={styles.container}>
			<Text variant="headlineMedium" style={styles.header}>
				Parallel Rooms
			</Text>
			<Text variant="bodyMedium" style={styles.subheader}>
				Gentle companionship without pressure to talk
			</Text>

			{joinedRoom && (
				<Card style={styles.activeNotice}>
					<Card.Content>
						<Text variant="titleSmall" style={styles.activeNoticeText}>
							✨ You're currently in a room. Take your time and enjoy the
							presence.
						</Text>
					</Card.Content>
				</Card>
			)}

			<FlatList
				data={rooms}
				renderItem={renderRoom}
				keyExtractor={(item) => item.id}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.listContent}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
		padding: theme.spacing.md,
	},
	header: {
		color: theme.colors.primary,
		marginBottom: theme.spacing.xs,
		marginTop: theme.spacing.md,
	},
	subheader: {
		color: theme.colors.outline,
		marginBottom: theme.spacing.lg,
	},
	activeNotice: {
		marginBottom: theme.spacing.md,
		backgroundColor: theme.colors.primaryContainer,
	},
	activeNoticeText: {
		color: theme.colors.primary,
		textAlign: "center",
	},
	listContent: {
		paddingBottom: theme.spacing.md,
	},
	roomCard: {
		marginBottom: theme.spacing.md,
		elevation: 2,
	},
	activeRoomCard: {
		borderColor: theme.colors.primary,
		borderWidth: 2,
	},
	roomHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: theme.spacing.sm,
	},
	roomTitle: {
		flex: 1,
		color: theme.colors.onSurface,
	},
	occupancyInfo: {
		backgroundColor: theme.colors.surfaceVariant,
		paddingHorizontal: theme.spacing.sm,
		paddingVertical: theme.spacing.xs,
		borderRadius: 12,
	},
	occupancyText: {
		color: theme.colors.onSurfaceVariant,
		fontWeight: "bold",
	},
	roomDescription: {
		marginBottom: theme.spacing.md,
		color: theme.colors.onSurfaceVariant,
		lineHeight: 20,
	},
	occupancyBar: {
		height: 4,
		borderRadius: 2,
		marginBottom: theme.spacing.md,
	},
	promptContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		padding: theme.spacing.md,
		borderRadius: 8,
		marginBottom: theme.spacing.md,
	},
	promptLabel: {
		color: theme.colors.primary,
		fontWeight: "bold",
		marginBottom: theme.spacing.xs,
	},
	promptText: {
		color: theme.colors.onSurfaceVariant,
		fontStyle: "italic",
		lineHeight: 18,
	},
	roomFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	roomTags: {
		flexDirection: "row",
		gap: theme.spacing.sm,
		flex: 1,
	},
});
