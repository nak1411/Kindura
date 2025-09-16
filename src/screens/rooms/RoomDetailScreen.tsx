import React, { useState, useEffect, useRef } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	Alert,
	Animated,
	Dimensions,
} from "react-native";
import {
	Text,
	Card,
	Button,
	Avatar,
	Chip,
	IconButton,
	Surface,
	ProgressBar,
} from "react-native-paper";
import { supabase } from "../../services/supabase";
import { theme } from "../../constants/theme";
import { ParallelRoom, User } from "../../types";
import AmbientSoundPlayer from "../../utils/AmbientSoundPlayer";

interface RoomDetailScreenProps {
	route: {
		params: {
			roomId: string;
		};
	};
	navigation: any;
}

interface RoomParticipant {
	id: string;
	display_name: string;
	care_score: number;
	preferences: User["preferences"];
}

export default function RoomDetailScreen({
	route,
	navigation,
}: RoomDetailScreenProps) {
	const { roomId } = route.params;
	const [room, setRoom] = useState<ParallelRoom | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [participants, setParticipants] = useState<RoomParticipant[]>([]);
	const [presenceTimer, setPresenceTimer] = useState(0);
	const [ambientSoundPlaying, setAmbientSoundPlaying] = useState(false);
	const [loading, setLoading] = useState(true);

	const presenceAnimation = useRef(new Animated.Value(0)).current;
	const presenceInterval = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		loadInitialData();
		setupRealtimeSubscriptions();
		startPresenceTimer();

		return () => {
			if (presenceInterval.current) clearInterval(presenceInterval.current);
		};
	}, []);

	useEffect(() => {
		// Animate presence indicator
		Animated.loop(
			Animated.sequence([
				Animated.timing(presenceAnimation, {
					toValue: 1,
					duration: 2000,
					useNativeDriver: true,
				}),
				Animated.timing(presenceAnimation, {
					toValue: 0,
					duration: 2000,
					useNativeDriver: true,
				}),
			])
		).start();
	}, []);

	const loadInitialData = async () => {
		try {
			// Load user
			const {
				data: { user: authUser },
			} = await supabase.auth.getUser();
			if (authUser) {
				const { data: userData } = await supabase
					.from("users")
					.select("*")
					.eq("id", authUser.id)
					.single();
				setUser(userData);
			}

			// Load room details
			const { data: roomData, error: roomError } = await supabase
				.from("parallel_rooms")
				.select("*")
				.eq("id", roomId)
				.single();

			if (roomError) throw roomError;
			setRoom(roomData);

			// Load participants
			if (roomData.current_participants.length > 0) {
				const { data: participantData } = await supabase
					.from("users")
					.select("id, display_name, care_score, preferences")
					.in("id", roomData.current_participants);

				setParticipants(participantData || []);
			}
		} catch (error) {
			console.error("Error loading room data:", error);
			Alert.alert("Error", "Failed to load room details");
		} finally {
			setLoading(false);
		}
	};

	const setupRealtimeSubscriptions = () => {
		// Subscribe to room updates
		const roomSubscription = supabase
			.channel(`room_${roomId}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "parallel_rooms",
					filter: `id=eq.${roomId}`,
				},
				(payload) => {
					if (payload.eventType === "UPDATE") {
						const updatedRoom = payload.new as ParallelRoom;
						setRoom(updatedRoom);
						loadParticipants(updatedRoom.current_participants);
					}
				}
			)
			.subscribe();

		return () => roomSubscription.unsubscribe();
	};

	const startPresenceTimer = () => {
		presenceInterval.current = setInterval(() => {
			setPresenceTimer((prev) => prev + 1);
		}, 1000);
	};

	const loadParticipants = async (participantIds: string[]) => {
		if (participantIds.length === 0) {
			setParticipants([]);
			return;
		}

		const { data } = await supabase
			.from("users")
			.select("id, display_name, care_score, preferences")
			.in("id", participantIds);

		setParticipants(data || []);
	};

	const sendGentleNudge = () => {
		Alert.alert(
			"Gentle Wave Sent",
			"You've sent a peaceful acknowledgment to everyone in the room. ✨",
			[{ text: "OK" }]
		);
	};

	const startFocusSession = () => {
		Alert.alert(
			"Focus Session",
			"Starting a 25-minute focus session. Others in the room can see you're focusing and may join quietly.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Begin Focus",
					onPress: () => {
						Alert.alert(
							"Focus Started",
							"Enjoy your peaceful focus time. The timer is running quietly in the background."
						);
					},
				},
			]
		);
	};

	const leaveRoom = async () => {
		if (!user || !room) return;

		Alert.alert(
			"Leave Room",
			"Are you sure you want to leave this peaceful space?",
			[
				{ text: "Stay", style: "cancel" },
				{
					text: "Leave",
					onPress: async () => {
						try {
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

							// Record interaction for care score
							try {
								await supabase.from("user_interactions").insert({
									user_id: user.id,
									interaction_type: "room_participated",
									points: Math.floor(presenceTimer / 60), // 1 point per minute
								});
							} catch (interactionError) {
								console.warn("Failed to record interaction:", interactionError);
								// Don't fail the leave operation if interaction recording fails
							}

							// Navigate back to rooms list
							navigation.goBack();
						} catch (error) {
							console.error("Error leaving room:", error);
							Alert.alert("Error", "Failed to leave room");
						}
					},
				},
			]
		);
	};

	const toggleAmbientSound = () => {
		setAmbientSoundPlaying(!ambientSoundPlaying);
	};

	const formatPresenceTime = (seconds: number) => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
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

	if (loading || !room) {
		return (
			<View style={styles.loadingContainer}>
				<Text>Loading room...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Header */}
			<Surface style={styles.header}>
				<View style={styles.headerContent}>
					<View style={styles.headerLeft}>
						<Text variant="headlineSmall" style={styles.roomTitle}>
							{getRoomIcon(room.room_type)} {room.name}
						</Text>
						<Text variant="bodySmall" style={styles.presenceTime}>
							You've been present for {formatPresenceTime(presenceTimer)}
						</Text>
					</View>
					<IconButton
						icon="close"
						onPress={leaveRoom}
						style={styles.closeButton}
					/>
				</View>
			</Surface>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Presence Indicator */}
				<Card style={styles.presenceCard}>
					<Card.Content>
						<View style={styles.presenceHeader}>
							<Animated.View
								style={[
									styles.presenceIndicator,
									{
										opacity: presenceAnimation,
									},
								]}
							/>
							<Text variant="titleMedium">Gentle Presence</Text>
						</View>
						<Text variant="bodyMedium" style={styles.presenceDescription}>
							{participants.length}{" "}
							{participants.length === 1 ? "soul is" : "souls are"} sharing this
							peaceful moment
						</Text>
					</Card.Content>
				</Card>

				{/* Participants */}
				<Card style={styles.participantsCard}>
					<Card.Content>
						<Text variant="titleMedium" style={styles.sectionTitle}>
							Present Souls
						</Text>
						<View style={styles.participantsList}>
							{participants.map((participant) => (
								<View key={participant.id} style={styles.participantItem}>
									<Avatar.Text
										size={40}
										label={participant.display_name.charAt(0).toUpperCase()}
										style={styles.participantAvatar}
									/>
									<Text variant="bodyMedium">{participant.display_name}</Text>
								</View>
							))}
						</View>
					</Card.Content>
				</Card>

				{/* Room Description */}
				{room.description && (
					<Card style={styles.descriptionCard}>
						<Card.Content>
							<Text variant="titleMedium" style={styles.sectionTitle}>
								About This Space
							</Text>
							<Text variant="bodyMedium" style={styles.description}>
								{room.description}
							</Text>
						</Card.Content>
					</Card>
				)}

				{/* Prompt of the Moment */}
				{room.prompt_of_moment && (
					<Card style={styles.promptCard}>
						<Card.Content>
							<Text variant="titleMedium" style={styles.promptLabel}>
								Moment's reflection
							</Text>
							<Text variant="bodyLarge" style={styles.promptText}>
								{room.prompt_of_moment}
							</Text>
						</Card.Content>
					</Card>
				)}

				{/* Ambient Sound Control */}
				{room.ambient_sound && (
					<AmbientSoundPlayer
						soundName={room.ambient_sound}
						isPlaying={ambientSoundPlaying}
						onTogglePlay={toggleAmbientSound}
						style={styles.soundPlayer}
					/>
				)}

				{/* Room Activities */}
				<Card style={styles.activitiesCard}>
					<Card.Content>
						<Text variant="titleMedium" style={styles.sectionTitle}>
							Peaceful Activities
						</Text>
						<Text variant="bodyMedium" style={styles.activitiesDescription}>
							Choose a gentle way to spend your time in this space
						</Text>

						<View style={styles.activityButtons}>
							<Button
								mode="outlined"
								onPress={startFocusSession}
								style={styles.activityButton}
								icon="target"
							>
								Focus (25 min)
							</Button>
							<Button
								mode="outlined"
								onPress={() =>
									Alert.alert(
										"Breathing",
										"Take five deep breaths and feel the calm."
									)
								}
								style={styles.activityButton}
								icon="lungs"
							>
								Breathe (5 min)
							</Button>
							<Button
								mode="outlined"
								onPress={() =>
									Alert.alert(
										"Meditation",
										"Close your eyes and find your center."
									)
								}
								style={styles.activityButton}
								icon="meditation"
							>
								Meditate (10 min)
							</Button>
						</View>
					</Card.Content>
				</Card>

				{/* Room Stats */}
				<Card style={styles.statsCard}>
					<Card.Content>
						<Text variant="titleMedium" style={styles.sectionTitle}>
							Room Atmosphere
						</Text>
						<View style={styles.statsRow}>
							<View style={styles.statItem}>
								<Text variant="headlineMedium" style={styles.statNumber}>
									{participants.length}
								</Text>
								<Text variant="bodySmall" style={styles.statLabel}>
									Present
								</Text>
							</View>
							<View style={styles.statItem}>
								<Text variant="headlineMedium" style={styles.statNumber}>
									{room.max_capacity}
								</Text>
								<Text variant="bodySmall" style={styles.statLabel}>
									Capacity
								</Text>
							</View>
							<View style={styles.statItem}>
								<Text variant="headlineMedium" style={styles.statNumber}>
									{formatPresenceTime(presenceTimer)}
								</Text>
								<Text variant="bodySmall" style={styles.statLabel}>
									Your Time
								</Text>
							</View>
						</View>

						<ProgressBar
							progress={participants.length / room.max_capacity}
							color={theme.colors.primary}
							style={styles.occupancyProgress}
						/>
					</Card.Content>
				</Card>
			</ScrollView>

			{/* Action Buttons */}
			<View style={styles.actionButtons}>
				<Button
					mode="outlined"
					onPress={sendGentleNudge}
					style={styles.actionButton}
					icon="hand-wave"
				>
					Wave Hello
				</Button>
				<Button
					mode="contained"
					onPress={leaveRoom}
					style={styles.leaveButton}
					icon="exit-to-app"
				>
					Leave Quietly
				</Button>
			</View>
		</View>
	);
}

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: theme.colors.background,
	},
	header: {
		elevation: 4,
		paddingTop: 40,
		paddingBottom: 16,
		paddingHorizontal: 16,
	},
	headerContent: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	headerLeft: {
		flex: 1,
	},
	roomTitle: {
		color: theme.colors.primary,
		fontWeight: "bold",
	},
	presenceTime: {
		color: theme.colors.outline,
		marginTop: 4,
	},
	closeButton: {
		margin: 0,
	},
	content: {
		flex: 1,
		padding: 16,
	},
	presenceCard: {
		marginBottom: 16,
		backgroundColor: theme.colors.primaryContainer,
	},
	presenceHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	presenceIndicator: {
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: theme.colors.primary,
		marginRight: 8,
	},
	presenceDescription: {
		color: theme.colors.onPrimaryContainer,
	},
	participantsCard: {
		marginBottom: 16,
	},
	sectionTitle: {
		color: theme.colors.primary,
		marginBottom: 12,
	},
	participantsList: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
	},
	participantItem: {
		alignItems: "center",
		marginBottom: 8,
	},
	participantAvatar: {
		marginBottom: 4,
	},
	descriptionCard: {
		marginBottom: 16,
	},
	description: {
		color: theme.colors.onSurface,
		lineHeight: 20,
	},
	promptCard: {
		marginBottom: 16,
		backgroundColor: theme.colors.surfaceVariant,
	},
	promptLabel: {
		color: theme.colors.primary,
		marginBottom: 8,
	},
	promptText: {
		color: theme.colors.onSurfaceVariant,
		fontStyle: "italic",
		lineHeight: 24,
	},
	soundPlayer: {
		marginBottom: 16,
	},
	activitiesCard: {
		marginBottom: 16,
	},
	activitiesDescription: {
		color: theme.colors.onSurface,
		marginBottom: 16,
	},
	activityButtons: {
		gap: 8,
	},
	activityButton: {
		marginBottom: 8,
	},
	statsCard: {
		marginBottom: 16,
	},
	statsRow: {
		flexDirection: "row",
		justifyContent: "space-around",
		marginBottom: 16,
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
		marginTop: 4,
	},
	occupancyProgress: {
		height: 8,
		borderRadius: 4,
	},
	actionButtons: {
		flexDirection: "row",
		padding: 16,
		gap: 12,
		backgroundColor: theme.colors.surface,
		elevation: 8,
	},
	actionButton: {
		flex: 1,
	},
	leaveButton: {
		flex: 1,
	},
});
