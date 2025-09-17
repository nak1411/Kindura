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

			setRooms(data || []);

			// Check if user is in any room
			if (user && data) {
				const userRoom = data.find((room) =>
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
			elevation: 4,
			paddingTop: 40,
			paddingBottom: 16,
			paddingHorizontal: 16,
		},
		title: {
			color: theme.colors.primary,
			fontWeight: "bold",
		},
		subtitle: {
			color: theme.colors.outline,
			marginTop: 4,
		},
		listContent: {
			padding: 16,
			paddingBottom: 80, // Space for FAB
		},
		roomCard: {
			marginBottom: 16,
			elevation: 2,
			borderRadius: 4,
		},
		activeRoomCard: {
			borderWidth: 2,
			elevation: 4,
		},
		roomHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 8,
		},
		roomTitle: {
			flex: 1,
		},
		occupancyInfo: {
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 8,
		},
		occupancyText: {
			fontSize: 12,
		},
		roomDescription: {
			marginBottom: 12,
			lineHeight: 20,
		},
		occupancyBar: {
			marginBottom: 16,
			height: 4,
		},
		roomFooter: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		},
		roomTags: {
			flexDirection: "row",
			gap: 8,
		},
		roomActions: {
			flexDirection: "row",
			gap: 8,
		},
		fab: {
			position: "absolute",
			margin: 16,
			right: 0,
			bottom: 0,
			backgroundColor: theme.colors.primary,
			borderRadius: 8,
		},
		modal: {
			margin: 20,
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
					Parallel Rooms
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
				contentContainerStyle={styles.listContent}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						colors={[theme.colors.primary]}
					/>
				}
				showsVerticalScrollIndicator={false}
			/>

			{/* Create Room FAB */}
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
							Create New Room
						</Text>

						<TextInput
							label="Room Name"
							value={newRoom.name}
							onChangeText={(text) =>
								setNewRoom((prev) => ({ ...prev, name: text }))
							}
							style={styles.input}
							maxLength={50}
						/>

						<TextInput
							label="Description (optional)"
							value={newRoom.description}
							onChangeText={(text) =>
								setNewRoom((prev) => ({ ...prev, description: text }))
							}
							style={styles.input}
							multiline
							maxLength={200}
						/>

						<View style={styles.roomTypeContainer}>
							<Text variant="titleSmall" style={styles.roomTypeLabel}>
								Room Type
							</Text>
							<View style={styles.roomTypeGrid}>
								{["focus", "walk", "read", "create", "pray"].map((type) => (
									<Chip
										key={type}
										mode={newRoom.room_type === type ? "flat" : "outlined"}
										selected={newRoom.room_type === type}
										onPress={() =>
											setNewRoom((prev) => ({
												...prev,
												room_type: type as ParallelRoom["room_type"],
											}))
										}
										style={[
											styles.roomTypeChip,
											newRoom.room_type === type && styles.selectedRoomTypeChip,
										]}
									>
										{getRoomIcon(type)} {type}
									</Chip>
								))}
							</View>
						</View>

						<View style={styles.capacityContainer}>
							<Text variant="titleSmall" style={styles.capacityLabel}>
								Max Capacity: {newRoom.max_capacity}
							</Text>
							<View style={styles.capacitySlider}>
								{[2, 4, 6, 8, 12].map((capacity) => (
									<Chip
										key={capacity}
										mode={
											newRoom.max_capacity === capacity ? "flat" : "outlined"
										}
										selected={newRoom.max_capacity === capacity}
										onPress={() =>
											setNewRoom((prev) => ({
												...prev,
												max_capacity: capacity,
											}))
										}
										style={styles.roomTypeChip}
									>
										{capacity}
									</Chip>
								))}
							</View>
						</View>

						{user?.faith_mode && (
							<View style={styles.switchContainer}>
								<Text variant="titleSmall" style={styles.switchLabel}>
									Faith Content
								</Text>
								<Switch
									value={newRoom.faith_content}
									onValueChange={(value) =>
										setNewRoom((prev) => ({ ...prev, faith_content: value }))
									}
								/>
							</View>
						)}

						<View style={styles.modalActions}>
							<Button mode="outlined" onPress={() => setShowCreateModal(false)}>
								Cancel
							</Button>
							<Button
								mode="contained"
								onPress={createRoom}
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
