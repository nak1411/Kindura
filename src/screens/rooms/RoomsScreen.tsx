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
import { useTheme } from "../../constants/theme-context";
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
		faith_content: false,
	});
	const { theme } = useTheme();

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

	// Clean up orphaned participant IDs across all rooms
	const cleanupRoomParticipants = async (roomsData: ParallelRoom[]) => {
		const roomsNeedingCleanup: Array<{
			id: string;
			cleanedParticipants: string[];
			invalidCount: number;
		}> = [];

		for (const room of roomsData) {
			if (room.current_participants.length > 0) {
				// Check which participant IDs actually exist
				const { data: validUsers } = await supabase
					.from("users")
					.select("id")
					.in("id", room.current_participants);

				const validUserIds = validUsers?.map((u) => u.id) || [];
				const invalidUserIds = room.current_participants.filter(
					(id: string) => !validUserIds.includes(id)
				);

				// If there are invalid users, add to cleanup list
				if (invalidUserIds.length > 0) {
					const cleanedParticipants = room.current_participants.filter(
						(id: string) => validUserIds.includes(id)
					);

					roomsNeedingCleanup.push({
						id: room.id,
						cleanedParticipants,
						invalidCount: invalidUserIds.length,
					});
				}
			}
		}

		// Batch update all rooms that need cleanup
		if (roomsNeedingCleanup.length > 0) {
			console.log(
				`Cleaning up participants in ${roomsNeedingCleanup.length} rooms`
			);

			for (const roomUpdate of roomsNeedingCleanup) {
				try {
					await supabase
						.from("parallel_rooms")
						.update({ current_participants: roomUpdate.cleanedParticipants })
						.eq("id", roomUpdate.id);

					console.log(
						`Removed ${roomUpdate.invalidCount} invalid participants from room ${roomUpdate.id}`
					);
				} catch (error) {
					console.error(`Failed to cleanup room ${roomUpdate.id}:`, error);
				}
			}

			// Return cleaned rooms data
			return roomsData.map((room) => {
				const cleanupInfo = roomsNeedingCleanup.find((c) => c.id === room.id);
				if (cleanupInfo) {
					return {
						...room,
						current_participants: cleanupInfo.cleanedParticipants,
					};
				}
				return room;
			});
		}

		return roomsData;
	};

	const loadRooms = async () => {
		setLoading(true);
		try {
			let query = supabase
				.from("parallel_rooms")
				.select("*")
				.eq("is_active", true);

			// Filter faith content based on user preference
			if (user && !user.faith_mode) {
				query = query.eq("faith_content", false);
			}

			const { data, error } = await query.order("created_at", {
				ascending: false,
			});

			if (error) throw error;

			let roomsData = data || [];

			// Clean up orphaned participants before displaying
			roomsData = await cleanupRoomParticipants(roomsData);

			setRooms(roomsData);

			// Check if user is in any room
			if (user && roomsData) {
				const userRoom = roomsData.find((room) =>
					room.current_participants.includes(user.id)
				);
				setJoinedRoom(userRoom?.id || null);
			}
		} catch (error) {
			console.error("Error loading rooms:", error);
			Alert.alert("Error", "Failed to load rooms");
		} finally {
			setLoading(false);
		}
	};

	const onRefresh = async () => {
		setRefreshing(true);
		await loadRooms();
		setRefreshing(false);
	};

	const joinRoom = async (roomId: string) => {
		if (!user) return;

		try {
			// Check if room is full
			const { data: roomData } = await supabase
				.from("parallel_rooms")
				.select("current_participants, max_capacity")
				.eq("id", roomId)
				.single();

			if (
				roomData &&
				roomData.current_participants.length >= roomData.max_capacity
			) {
				Alert.alert("Room Full", "This room is currently at capacity");
				return;
			}

			// Add user to room
			const updatedParticipants = [
				...(roomData?.current_participants || []),
				user.id,
			];

			const { error } = await supabase
				.from("parallel_rooms")
				.update({ current_participants: updatedParticipants })
				.eq("id", roomId);

			if (error) throw error;

			setJoinedRoom(roomId);
			navigation.navigate("RoomDetail", { roomId });
		} catch (error) {
			console.error("Error joining room:", error);
			Alert.alert("Error", "Failed to join room");
		}
	};

	const leaveRoom = async (roomId: string) => {
		if (!user) return;

		Alert.alert("Leave Room", "Are you sure you want to leave this room?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Leave",
				style: "destructive",
				onPress: async () => {
					try {
						// Get current room data
						const { data: roomData } = await supabase
							.from("parallel_rooms")
							.select("current_participants")
							.eq("id", roomId)
							.single();

						if (roomData) {
							const updatedParticipants = roomData.current_participants.filter(
								(id: string) => id !== user.id
							);

							await supabase
								.from("parallel_rooms")
								.update({ current_participants: updatedParticipants })
								.eq("id", roomId);

							setJoinedRoom(null);
							loadRooms(); // Refresh the room list
						}
					} catch (error) {
						console.error("Error leaving room:", error);
						Alert.alert("Error", "Failed to leave room");
					}
				},
			},
		]);
	};

	const createRoom = async () => {
		if (!user || !newRoom.name.trim()) {
			Alert.alert("Error", "Please enter a room name");
			return;
		}

		try {
			const { error } = await supabase.from("parallel_rooms").insert([
				{
					name: newRoom.name,
					description: newRoom.description || null,
					room_type: newRoom.room_type,
					max_capacity: newRoom.max_capacity,
					current_participants: [user.id],
					faith_content: newRoom.faith_content,
					ambient_sound: null, // Always set to null since we're removing audio
					created_by: user.id,
					is_active: true,
				},
			]);

			if (error) throw error;

			setShowCreateModal(false);
			setNewRoom({
				name: "",
				description: "",
				room_type: "focus",
				max_capacity: 8,
				faith_content: false,
			});

			Alert.alert("Success", "Room created successfully!");
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

	const renderRoom = ({ item }: { item: ParallelRoom }) => {
		const occupancyRatio = item.current_participants.length / item.max_capacity;
		const isJoined = joinedRoom === item.id;

		return (
			<Card
				style={[
					styles.roomCard,
					{ backgroundColor: theme.colors.surface },
					isJoined && [
						styles.activeRoomCard,
						{ borderColor: theme.colors.primary },
					],
				]}
			>
				<Card.Content>
					<View style={styles.roomHeader}>
						<Text
							variant="titleLarge"
							style={[styles.roomTitle, { color: theme.colors.onSurface }]}
						>
							{getRoomIcon(item.room_type)} {item.name}
						</Text>
						<View
							style={[
								styles.occupancyInfo,
								{ backgroundColor: theme.colors.surfaceVariant },
							]}
						>
							<Text
								variant="labelSmall"
								style={[
									styles.occupancyText,
									{ color: theme.colors.onSurfaceVariant },
								]}
							>
								{item.current_participants.length}/{item.max_capacity}
							</Text>
						</View>
					</View>

					{item.description && (
						<Text
							variant="bodyMedium"
							style={[
								styles.roomDescription,
								{ color: theme.colors.onSurfaceVariant },
							]}
						>
							{item.description}
						</Text>
					)}

					<ProgressBar
						progress={occupancyRatio}
						color={theme.colors.primary}
						style={styles.occupancyBar}
					/>

					<View style={styles.roomFooter}>
						<View style={styles.roomActions}>
							{isJoined ? (
								<>
									<Button
										mode="contained"
										onPress={() =>
											navigation.navigate("RoomDetail", { roomId: item.id })
										}
										compact
										style={{ marginRight: 8, borderRadius: 8 }}
									>
										Continue
									</Button>
									<Button
										mode="outlined"
										onPress={() => leaveRoom(item.id)}
										compact
										style={{ borderRadius: 8 }}
									>
										Leave
									</Button>
								</>
							) : (
								<Button
									mode="outlined"
									onPress={() => joinRoom(item.id)}
									compact
									style={{ borderRadius: 8 }}
									disabled={
										item.current_participants.length >= item.max_capacity
									}
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
		);
	};

	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.colors.background,
		},
		header: {
			backgroundColor: theme.colors.surface,
			paddingTop: 50,
			paddingBottom: 20,
			paddingHorizontal: 20,
			elevation: 2,
		},
		title: {
			color: theme.colors.primary,
			fontWeight: "bold",
		},
		subtitle: {
			color: theme.colors.onSurfaceVariant,
			marginTop: 4,
		},
		roomCard: {
			margin: 16,
			marginBottom: 8,
			elevation: 2,
		},
		activeRoomCard: {
			borderWidth: 2,
		},
		roomHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 8,
		},
		roomTitle: {
			flex: 1,
			marginRight: 8,
		},
		occupancyInfo: {
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 12,
		},
		occupancyText: {
			fontSize: 12,
			fontWeight: "bold",
		},
		roomDescription: {
			marginBottom: 12,
		},
		occupancyBar: {
			height: 4,
			marginBottom: 12,
		},
		roomFooter: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		roomActions: {
			flexDirection: "row",
			flex: 1,
		},
		fab: {
			position: "absolute",
			right: 16,
			bottom: 16,
			backgroundColor: theme.colors.primary,
		},
		modalContainer: {
			backgroundColor: "rgba(0, 0, 0, 0.5)",
			flex: 1,
			justifyContent: "center",
			padding: 20,
		},
		modalContent: {
			backgroundColor: theme.colors.surface,
			padding: 20,
			borderRadius: 8,
		},
		modalTitle: {
			color: theme.colors.primary,
			marginBottom: 16,
		},
		input: {
			marginBottom: 16,
			backgroundColor: theme.colors.background,
		},
		roomTypeContainer: {
			marginBottom: 16,
		},
		roomTypeLabel: {
			color: theme.colors.onSurface,
			marginBottom: 8,
		},
		roomTypeGrid: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		roomTypeChip: {
			backgroundColor: "transparent",
		},
		selectedRoomTypeChip: {
			backgroundColor: theme.colors.primaryContainer,
		},
		capacityContainer: {
			marginBottom: 16,
		},
		capacityLabel: {
			color: theme.colors.onSurface,
			marginBottom: 8,
		},
		capacitySlider: {
			marginBottom: 8,
		},
		switchContainer: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 16,
		},
		switchLabel: {
			color: theme.colors.onSurface,
		},
		modalActions: {
			flexDirection: "row",
			justifyContent: "flex-end",
			gap: 8,
			marginTop: 16,
		},
	});

	return (
		<View style={styles.container}>
			{/* Header */}
			<Surface style={styles.header}>
				<Text variant="headlineMedium" style={styles.title}>
					Rooms
				</Text>
				<Text variant="bodyMedium" style={styles.subtitle}>
					Share focused time with others
				</Text>
			</Surface>

			{/* Rooms List */}
			<FlatList
				data={rooms}
				renderItem={renderRoom}
				keyExtractor={(item) => item.id}
				contentContainerStyle={{ paddingBottom: 80 }}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
				showsVerticalScrollIndicator={false}
			/>

			{/* Create Room FAB */}
			<FAB
				icon="plus"
				style={styles.fab}
				onPress={() => setShowCreateModal(true)}
			/>

			{/* Create Room Modal */}
			<Portal>
				<Modal
					visible={showCreateModal}
					onDismiss={() => setShowCreateModal(false)}
					contentContainerStyle={styles.modalContainer}
				>
					<Surface style={styles.modalContent}>
						<Text variant="titleLarge" style={styles.modalTitle}>
							Create New Room
						</Text>

						<TextInput
							label="Room Name"
							value={newRoom.name}
							onChangeText={(text) => setNewRoom({ ...newRoom, name: text })}
							style={styles.input}
						/>

						<TextInput
							label="Description (Optional)"
							value={newRoom.description}
							onChangeText={(text) =>
								setNewRoom({ ...newRoom, description: text })
							}
							style={styles.input}
							multiline
						/>

						{/* Room Type Selection */}
						<View style={styles.roomTypeContainer}>
							<Text variant="bodyMedium" style={styles.roomTypeLabel}>
								Room Type
							</Text>
							<View style={styles.roomTypeGrid}>
								{(
									[
										"focus",
										"walk",
										"read",
										"create",
										"pray",
									] as ParallelRoom["room_type"][]
								).map((type) => (
									<Chip
										key={type}
										selected={newRoom.room_type === type}
										onPress={() => setNewRoom({ ...newRoom, room_type: type })}
										style={[
											styles.roomTypeChip,
											newRoom.room_type === type && styles.selectedRoomTypeChip,
										]}
									>
										{getRoomIcon(type)}{" "}
										{type.charAt(0).toUpperCase() + type.slice(1)}
									</Chip>
								))}
							</View>
						</View>

						{/* Max Capacity */}
						<View style={styles.capacityContainer}>
							<Text variant="bodyMedium" style={styles.capacityLabel}>
								Max Capacity: {newRoom.max_capacity}
							</Text>
						</View>

						{/* Faith Content Toggle */}
						<View style={styles.switchContainer}>
							<Text variant="bodyMedium" style={styles.switchLabel}>
								Faith-based content
							</Text>
							<Switch
								value={newRoom.faith_content}
								onValueChange={(value) =>
									setNewRoom({ ...newRoom, faith_content: value })
								}
							/>
						</View>

						{/* Actions */}
						<View style={styles.modalActions}>
							<Button onPress={() => setShowCreateModal(false)}>Cancel</Button>
							<Button mode="contained" onPress={createRoom}>
								Create
							</Button>
						</View>
					</Surface>
				</Modal>
			</Portal>
		</View>
	);
}
