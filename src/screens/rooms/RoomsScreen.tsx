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
		ambient_sound: "",
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
					ambient_sound: newRoom.ambient_sound || null,
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
				ambient_sound: "",
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

					{item.ambient_sound && (
						<View
							style={[
								styles.promptContainer,
								{ backgroundColor: theme.colors.surfaceVariant },
							]}
						>
							<Text
								variant="labelMedium"
								style={[styles.promptLabel, { color: theme.colors.primary }]}
							>
								Ambient Sound
							</Text>
							<Text
								variant="bodySmall"
								style={[
									styles.promptText,
									{ color: theme.colors.onSurfaceVariant },
								]}
							>
								{item.ambient_sound}
							</Text>
						</View>
					)}

					<View style={styles.roomFooter}>
						<View style={styles.roomTags}>
							<Chip mode="outlined" compact>
								{item.room_type}
							</Chip>
							{item.faith_content && (
								<Chip mode="outlined" compact icon="heart">
									Faith
								</Chip>
							)}
						</View>

						<View style={styles.roomActions}>
							{isJoined ? (
								<Button
									mode="contained"
									compact
									onPress={() =>
										navigation.navigate("RoomDetail", { roomId: item.id })
									}
									style={styles.actionButton}
								>
									Enter
								</Button>
							) : (
								<Button
									mode="outlined"
									compact
									onPress={() => joinRoom(item.id)}
									disabled={occupancyRatio >= 1}
									style={styles.actionButton}
								>
									{occupancyRatio >= 1 ? "Full" : "Join"}
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
		},
		occupancyInfo: {
			paddingHorizontal: theme.spacing.sm,
			paddingVertical: theme.spacing.xs,
			borderRadius: 12,
		},
		occupancyText: {
			fontWeight: "bold",
		},
		roomDescription: {
			marginBottom: theme.spacing.md,
			lineHeight: 20,
		},
		occupancyBar: {
			height: 4,
			borderRadius: 2,
			marginBottom: theme.spacing.md,
		},
		promptContainer: {
			padding: theme.spacing.md,
			borderRadius: 8,
			marginBottom: theme.spacing.md,
		},
		promptLabel: {
			fontWeight: "bold",
			marginBottom: theme.spacing.xs,
		},
		promptText: {
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
			backgroundColor: theme.colors.surface,
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

	return (
		<View style={styles.container}>
			<Text variant="headlineMedium" style={styles.header}>
				Parallel Rooms
			</Text>
			<Text variant="bodyMedium" style={styles.subheader}>
				Join a peaceful space to work, pray, or create alongside others
			</Text>

			{joinedRoom && (
				<Card style={styles.activeNotice}>
					<Card.Content>
						<Text variant="bodyMedium" style={styles.activeNoticeText}>
							You're currently in a room. Tap "Enter" to return to it.
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
							onChangeText={(text) => setNewRoom({ ...newRoom, name: text })}
							style={styles.formInput}
							mode="outlined"
						/>

						<TextInput
							label="Description (Optional)"
							value={newRoom.description}
							onChangeText={(text) =>
								setNewRoom({ ...newRoom, description: text })
							}
							multiline
							numberOfLines={3}
							style={styles.formInput}
							mode="outlined"
						/>

						<View style={styles.roomTypeContainer}>
							<Text variant="titleMedium" style={styles.sectionLabel}>
								Room Type
							</Text>
							<View style={styles.roomTypeOptions}>
								{["focus", "walk", "read", "create", "pray"].map((type) => (
									<Chip
										key={type}
										selected={newRoom.room_type === type}
										onPress={() =>
											setNewRoom({ ...newRoom, room_type: type as any })
										}
										style={styles.roomTypeChip}
									>
										{getRoomIcon(type)} {type}
									</Chip>
								))}
							</View>
						</View>

						<View style={styles.settingRow}>
							<View style={styles.settingText}>
								<Text
									variant="bodyLarge"
									style={{ color: theme.colors.onSurface }}
								>
									Faith Content
								</Text>
								<Text variant="bodySmall" style={styles.settingDescription}>
									Include prayer and spiritual elements
								</Text>
							</View>
							<Switch
								value={newRoom.faith_content}
								onValueChange={(value) =>
									setNewRoom({ ...newRoom, faith_content: value })
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
							>
								Create
							</Button>
						</View>
					</Surface>
				</Modal>
			</Portal>

			<FAB
				icon="plus"
				style={styles.fab}
				onPress={() => setShowCreateModal(true)}
			/>
		</View>
	);
}
