import React, { useState, useEffect } from "react";
import {
	View,
	StyleSheet,
	FlatList,
	RefreshControl,
	Alert,
	TouchableOpacity,
} from "react-native";
import {
	Text,
	Card,
	Button,
	Avatar,
	Chip,
	ProgressBar,
	FAB,
	Portal,
	Modal,
	Surface,
	TextInput,
	Switch,
} from "react-native-paper";
import { supabase } from "../../services/supabase";
import { theme } from "../../constants/theme";
import { ParallelRoom, User } from "../../types";

interface RoomsScreenProps {
	navigation: any;
}

export default function RoomsScreen({ navigation }: RoomsScreenProps) {
	const [rooms, setRooms] = useState<ParallelRoom[]>([]);
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [newRoom, setNewRoom] = useState({
		name: "",
		description: "",
		room_type: "focus" as ParallelRoom["room_type"],
		max_capacity: 8,
		ambient_sound: "",
		faith_content: false,
	});

	useEffect(() => {
		loadUser();
	}, []);

	useEffect(() => {
		if (user) {
			loadRooms();
		}
	}, [user]);

	useEffect(() => {
		if (user) {
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
		}
	}, [user]);

	// Add focus listener to refresh when returning to screen
	useEffect(() => {
		const unsubscribe = navigation.addListener("focus", () => {
			if (user) {
				loadRooms();
			}
		});

		return unsubscribe;
	}, [navigation, user]);

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
			if (user) {
				const userInRoom = data?.find((room) =>
					room.current_participants.includes(user.id)
				);
				setJoinedRoom(userInRoom?.id || null);
			}
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
		if (!user) {
			Alert.alert("Error", "Please wait while we load your profile");
			return;
		}

		if (room.current_participants.includes(user.id)) {
			// If user is already in room, navigate to detail screen
			navigation.navigate("RoomDetail", { roomId: room.id });
			return;
		}

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

			// Navigate to room detail screen
			navigation.navigate("RoomDetail", { roomId: room.id });
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

	const createRoom = async () => {
		if (!user || !newRoom.name.trim()) {
			Alert.alert("Missing Information", "Please enter a room name");
			return;
		}

		try {
			const { error } = await supabase.from("parallel_rooms").insert({
				name: newRoom.name.trim(),
				description: newRoom.description.trim() || null,
				room_type: newRoom.room_type,
				max_capacity: newRoom.max_capacity,
				ambient_sound: newRoom.ambient_sound.trim() || null,
				faith_content: newRoom.faith_content,
				current_participants: [user.id],
				is_active: true,
			});

			if (error) throw error;

			Alert.alert("Success!", "Your peaceful space has been created");
			setShowCreateModal(false);
			setNewRoom({
				name: "",
				description: "",
				room_type: "focus",
				max_capacity: 8,
				ambient_sound: "",
				faith_content: false,
			});
			loadRooms();
		} catch (error) {
			console.error("Error creating room:", error);
			Alert.alert("Error", "Failed to create room");
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

	const getRoomTypeOptions = () => [
		{ label: "🎯 Focus", value: "focus" },
		{ label: "🚶 Walking", value: "walk" },
		{ label: "📚 Reading", value: "read" },
		{ label: "🎨 Creating", value: "create" },
		{ label: "🙏 Prayer", value: "pray" },
	];

	const navigateToRoom = (room: ParallelRoom) => {
		if (!user) {
			Alert.alert("Error", "Please wait while we load your profile");
			return;
		}

		const isUserInRoom = room.current_participants.includes(user.id);

		if (isUserInRoom) {
			// Navigate directly to room detail if user is already in the room
			navigation.navigate("RoomDetail", { roomId: room.id });
		} else {
			// Join the room first
			joinRoom(room);
		}
	};

	const renderRoom = ({ item }: { item: ParallelRoom }) => {
		if (!user) {
			// Don't render anything if user is not loaded yet
			return null;
		}

		const isUserInRoom = item.current_participants.includes(user.id);
		const occupancy = item.current_participants.length / item.max_capacity;

		return (
			<TouchableOpacity
				onPress={() => navigateToRoom(item)}
				activeOpacity={0.7}
			>
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
							color={
								occupancy > 0.8 ? theme.colors.error : theme.colors.primary
							}
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
								{isUserInRoom && (
									<Chip compact mode="outlined" icon="account-check">
										Present
									</Chip>
								)}
							</View>

							<View style={styles.roomActions}>
								{isUserInRoom ? (
									<>
										<Button
											mode="outlined"
											onPress={(e) => {
												e.stopPropagation();
												leaveRoom(item.id);
											}}
											style={styles.actionButton}
											compact
										>
											Leave
										</Button>
										<Button
											mode="contained"
											onPress={() =>
												navigation.navigate("RoomDetail", { roomId: item.id })
											}
											style={styles.actionButton}
											compact
										>
											Enter
										</Button>
									</>
								) : (
									<Button
										mode="contained"
										onPress={() => joinRoom(item)}
										disabled={
											item.current_participants.length >= item.max_capacity
										}
										style={styles.actionButton}
									>
										{item.current_participants.length >= item.max_capacity
											? "Full"
											: "Join"}
									</Button>
								)}
							</View>
						</View>
					</Card.Content>
				</Card>
			</TouchableOpacity>
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
							✨ You're currently in a room. Tap "Enter" to join the space.
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

			<FAB
				icon="plus"
				style={styles.fab}
				onPress={() => setShowCreateModal(true)}
				label="Create Room"
			/>

			{/* Create Room Modal */}
			<Portal>
				<Modal
					visible={showCreateModal}
					onDismiss={() => setShowCreateModal(false)}
					contentContainerStyle={styles.modal}
				>
					<Surface style={styles.modalContent}>
						<Text variant="headlineSmall" style={styles.modalTitle}>
							Create a Peaceful Space
						</Text>

						<TextInput
							label="Room Name"
							value={newRoom.name}
							onChangeText={(text) =>
								setNewRoom((prev) => ({ ...prev, name: text }))
							}
							mode="outlined"
							style={styles.formInput}
							placeholder="e.g., Morning Focus, Evening Reflection"
						/>

						<TextInput
							label="Description (optional)"
							value={newRoom.description}
							onChangeText={(text) =>
								setNewRoom((prev) => ({ ...prev, description: text }))
							}
							mode="outlined"
							multiline
							numberOfLines={2}
							style={styles.formInput}
							placeholder="What kind of gentle space are you creating?"
						/>

						<View style={styles.roomTypeContainer}>
							<Text variant="titleSmall" style={styles.sectionLabel}>
								Room Type
							</Text>
							<View style={styles.roomTypeOptions}>
								{getRoomTypeOptions().map((option) => (
									<Chip
										key={option.value}
										mode={
											newRoom.room_type === option.value ? "flat" : "outlined"
										}
										selected={newRoom.room_type === option.value}
										onPress={() =>
											setNewRoom((prev) => ({
												...prev,
												room_type: option.value as ParallelRoom["room_type"],
											}))
										}
										style={styles.roomTypeChip}
									>
										{option.label}
									</Chip>
								))}
							</View>
						</View>

						<TextInput
							label="Ambient Sound (optional)"
							value={newRoom.ambient_sound}
							onChangeText={(text) =>
								setNewRoom((prev) => ({ ...prev, ambient_sound: text }))
							}
							mode="outlined"
							style={styles.formInput}
							placeholder="e.g., rain, forest, quiet"
						/>

						<View style={styles.settingRow}>
							<View style={styles.settingText}>
								<Text variant="bodyMedium">Faith Content</Text>
								<Text variant="bodySmall" style={styles.settingDescription}>
									Include spiritual elements
								</Text>
							</View>
							<Switch
								value={newRoom.faith_content}
								onValueChange={(value) =>
									setNewRoom((prev) => ({ ...prev, faith_content: value }))
								}
							/>
						</View>

						<View style={styles.modalButtons}>
							<Button
								mode="outlined"
								onPress={() => setShowCreateModal(false)}
								style={styles.modalButton}
							>
								Cancel
							</Button>
							<Button
								mode="contained"
								onPress={createRoom}
								style={styles.modalButton}
								disabled={!newRoom.name.trim()}
							>
								Create
							</Button>
						</View>
					</Surface>
				</Modal>
			</Portal>
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
		paddingBottom: 100, // Space for FAB
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
		flexWrap: "wrap",
	},
	roomActions: {
		flexDirection: "row",
		gap: theme.spacing.xs,
	},
	actionButton: {
		minWidth: 60,
	},
	fab: {
		position: "absolute",
		right: 16,
		bottom: 16,
	},
	modal: {
		padding: 20,
		justifyContent: "center",
	},
	modalContent: {
		padding: 24,
		borderRadius: 16,
		maxHeight: "90%",
	},
	modalTitle: {
		color: theme.colors.primary,
		marginBottom: 20,
		textAlign: "center",
	},
	formInput: {
		marginBottom: 16,
	},
	roomTypeContainer: {
		marginBottom: 16,
	},
	sectionLabel: {
		color: theme.colors.primary,
		marginBottom: 8,
	},
	roomTypeOptions: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	roomTypeChip: {
		marginBottom: 4,
	},
	settingRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 20,
	},
	settingText: {
		flex: 1,
	},
	settingDescription: {
		color: theme.colors.outline,
		marginTop: 2,
	},
	modalButtons: {
		flexDirection: "row",
		gap: 12,
		marginTop: 8,
	},
	modalButton: {
		flex: 1,
	},
});
