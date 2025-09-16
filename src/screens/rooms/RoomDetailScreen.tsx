import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView, Alert, BackHandler } from "react-native";
import {
	Text,
	Surface,
	Card,
	Button,
	Avatar,
	Chip,
	IconButton,
	TextInput,
} from "react-native-paper";
import { supabase } from "../../services/supabase";
import { theme } from "../../constants/theme";
import { ParallelRoom, User } from "../../types";
import { roomUtils, RoomMessage, RoomParticipant } from "../../utils/roomUtils";

interface RoomDetailScreenProps {
	route: {
		params: {
			roomId: string;
		};
	};
	navigation: any;
}

export default function RoomDetailScreen({
	route,
	navigation,
}: RoomDetailScreenProps) {
	const { roomId } = route.params;
	const [user, setUser] = useState<User | null>(null);
	const [room, setRoom] = useState<ParallelRoom | null>(null);
	const [participants, setParticipants] = useState<RoomParticipant[]>([]);
	const [loading, setLoading] = useState(true);
	const [presenceTimer, setPresenceTimer] = useState(0);
	const [messages, setMessages] = useState<RoomMessage[]>([]);
	const [messageInput, setMessageInput] = useState("");
	const [sendingMessage, setSendingMessage] = useState(false);

	const presenceInterval = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		loadUser();
	}, []);

	useEffect(() => {
		if (user) {
			loadRoomData();
			loadMessages();

			const unsubscribeRealtime = setupRealtimeSubscriptions();
			const unsubscribeBackHandler = setupBackHandler();

			startPresenceTimer();

			return () => {
				unsubscribeRealtime();
				unsubscribeBackHandler();
				if (presenceInterval.current) {
					clearInterval(presenceInterval.current);
				}
			};
		}
	}, [roomId, user]);

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

	const loadRoomData = async () => {
		try {
			const { data: roomData, error } = await supabase
				.from("parallel_rooms")
				.select("*")
				.eq("id", roomId)
				.single();

			if (error) throw error;

			setRoom(roomData);
			await loadParticipants(roomData?.current_participants || []);
		} catch (error) {
			console.error("Error loading room data:", error);
			Alert.alert("Error", "Failed to load room details");
		} finally {
			setLoading(false);
		}
	};

	const loadMessages = async () => {
		try {
			const roomMessages = await roomUtils.getRoomMessages(roomId, 50);
			setMessages(roomMessages.reverse()); // Reverse to show oldest first
		} catch (error) {
			console.error("Error loading messages:", error);
		}
	};

	const sendMessage = async () => {
		if (!messageInput.trim() || !user || sendingMessage) return;

		setSendingMessage(true);
		try {
			const result = await roomUtils.sendMessage(
				roomId,
				user.id,
				messageInput.trim()
			);

			if (result.success) {
				setMessageInput("");
				// Refresh messages to ensure the new message appears
				await loadMessages();
			} else {
				Alert.alert("Error", result.error || "Failed to send message");
			}
		} catch (error) {
			console.error("Error sending message:", error);
			Alert.alert("Error", "Failed to send message");
		} finally {
			setSendingMessage(false);
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
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "room_messages",
					filter: `room_id=eq.${roomId}`,
				},
				async (payload) => {
					const newMessage = payload.new as RoomMessage;
					// Fetch user info for the new message
					try {
						const { data: userData } = await supabase
							.from("users")
							.select("id, display_name")
							.eq("id", newMessage.user_id)
							.single();

						if (userData) {
							setMessages((prev) => [
								...prev,
								{ ...newMessage, user: userData },
							]);
						} else {
							// Fallback if user data not found
							setMessages((prev) => [...prev, newMessage]);
						}
					} catch (error) {
						console.error("Error fetching user data for message:", error);
						// Still add the message without user info
						setMessages((prev) => [...prev, newMessage]);
					}
				}
			)
			.subscribe();

		return () => roomSubscription.unsubscribe();
	};

	const setupBackHandler = () => {
		const backHandler = BackHandler.addEventListener(
			"hardwareBackPress",
			() => {
				leaveRoom();
				return true;
			}
		);
		return () => backHandler.remove();
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

		setParticipants((data as RoomParticipant[]) || []);
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
						<IconButton
							icon="arrow-left"
							size={24}
							onPress={() => navigation.goBack()}
							style={styles.backButton}
						/>
						<View style={styles.headerInfo}>
							<Text variant="headlineSmall" style={styles.roomTitle}>
								{getRoomIcon(room.room_type)} {room.name}
							</Text>
							<Text variant="bodySmall" style={styles.presenceTime}>
								Present for {formatPresenceTime(presenceTimer)}
							</Text>
						</View>
					</View>
					<Button
						mode="outlined"
						onPress={leaveRoom}
						style={styles.leaveButton}
						compact
					>
						Leave
					</Button>
				</View>
			</Surface>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Room Status & Participants - Compact */}
				<Card style={styles.compactInfoCard}>
					<Card.Content>
						<View style={styles.compactHeader}>
							<Text variant="titleSmall" style={styles.compactStatusText}>
								{participants.length}{" "}
								{participants.length === 1 ? "soul" : "souls"} present
							</Text>
						</View>

						{/* Compact Participants List */}
						<View style={styles.compactParticipantsList}>
							{participants.map((participant) => (
								<View
									key={participant.id}
									style={styles.compactParticipantItem}
								>
									<Avatar.Text
										size={28}
										label={participant.display_name.charAt(0).toUpperCase()}
										style={styles.compactParticipantAvatar}
									/>
									<Text
										variant="bodySmall"
										style={styles.compactParticipantName}
									>
										{participant.display_name}
									</Text>
								</View>
							))}
						</View>
					</Card.Content>
				</Card>

				{/* Main Chat Section - Takes up most space */}
				<Card style={styles.mainChatCard}>
					<Card.Content style={styles.chatContent}>
						<View style={styles.chatHeader}>
							<Text variant="titleMedium" style={styles.chatTitle}>
								Room Chat
							</Text>
							<Text variant="bodySmall" style={styles.chatSubtitle}>
								Share thoughts and connect gently
							</Text>
						</View>

						{/* Messages List - Large */}
						<ScrollView
							style={styles.expandedMessagesList}
							showsVerticalScrollIndicator={false}
							contentContainerStyle={styles.messagesContainer}
						>
							{messages.length === 0 ? (
								<View style={styles.emptyMessages}>
									<Text variant="bodyLarge" style={styles.emptyText}>
										💬 Start a conversation
									</Text>
									<Text variant="bodyMedium" style={styles.emptySubtext}>
										Be the first to share a gentle thought with everyone in the
										room
									</Text>
								</View>
							) : (
								messages.map((message) => (
									<View key={message.id} style={styles.messageItem}>
										<View style={styles.messageHeader}>
											<Avatar.Text
												size={32}
												label={
													message.user?.display_name?.charAt(0).toUpperCase() ||
													"?"
												}
												style={styles.messageAvatar}
											/>
											<View style={styles.messageInfo}>
												<Text variant="bodyMedium" style={styles.messageSender}>
													{message.user?.display_name || "Anonymous"}
												</Text>
												<Text variant="bodySmall" style={styles.messageTime}>
													{new Date(message.created_at).toLocaleTimeString([], {
														hour: "2-digit",
														minute: "2-digit",
													})}
												</Text>
											</View>
										</View>
										<Text variant="bodyMedium" style={styles.messageContent}>
											{message.content}
										</Text>
									</View>
								))
							)}
						</ScrollView>

						{/* Message Input - Fixed at bottom */}
						<View style={styles.messageInputContainer}>
							<TextInput
								value={messageInput}
								onChangeText={setMessageInput}
								placeholder="Type a gentle message..."
								style={styles.messageInput}
								mode="outlined"
								multiline
								maxLength={200}
								right={
									<TextInput.Icon
										icon="send"
										onPress={sendMessage}
										disabled={!messageInput.trim() || sendingMessage}
									/>
								}
							/>
							<Text variant="bodySmall" style={styles.characterCount}>
								{messageInput.length}/200
							</Text>
						</View>
					</Card.Content>
				</Card>
			</ScrollView>
		</View>
	);
}

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
		paddingTop: 48,
		paddingHorizontal: theme.spacing.lg,
		paddingBottom: theme.spacing.md,
		elevation: 4,
	},
	headerContent: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	backButton: {
		margin: 0,
		marginRight: theme.spacing.sm,
	},
	headerInfo: {
		flex: 1,
	},
	roomTitle: {
		color: theme.colors.onSurface,
		fontWeight: "bold",
	},
	presenceTime: {
		color: theme.colors.outline,
		marginTop: 2,
	},
	leaveButton: {
		borderColor: theme.colors.outline,
	},
	content: {
		flex: 1,
		padding: theme.spacing.md,
	},
	compactInfoCard: {
		marginBottom: theme.spacing.sm,
		backgroundColor: theme.colors.surfaceVariant,
	},
	compactHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: theme.spacing.sm,
	},
	compactStatusText: {
		color: theme.colors.onSurfaceVariant,
		fontWeight: "500",
	},
	compactParticipantsList: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: theme.spacing.sm,
	},
	compactParticipantItem: {
		alignItems: "center",
		minWidth: 50,
	},
	compactParticipantAvatar: {
		marginBottom: theme.spacing.xs / 2,
		backgroundColor: theme.colors.primary,
	},
	compactParticipantName: {
		color: theme.colors.onSurfaceVariant,
		textAlign: "center",
		fontSize: 10,
	},
	mainChatCard: {
		flex: 1,
		marginBottom: theme.spacing.sm,
	},
	chatContent: {
		height: 500, // Fixed height to make it take up most of the screen
		flexDirection: "column",
	},
	chatHeader: {
		marginBottom: theme.spacing.md,
		paddingBottom: theme.spacing.sm,
		borderBottomWidth: 1,
		borderBottomColor: theme.colors.outline + "30",
	},
	chatTitle: {
		color: theme.colors.primary,
		fontWeight: "600",
		marginBottom: theme.spacing.xs / 2,
	},
	chatSubtitle: {
		color: theme.colors.outline,
	},
	expandedMessagesList: {
		flex: 1,
		marginBottom: theme.spacing.md,
	},
	messagesContainer: {
		paddingBottom: theme.spacing.md,
	},
	emptyMessages: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: theme.spacing.xl,
	},
	emptyText: {
		color: theme.colors.outline,
		textAlign: "center",
		marginBottom: theme.spacing.xs,
	},
	emptySubtext: {
		color: theme.colors.outline,
		textAlign: "center",
		opacity: 0.7,
	},
	messageItem: {
		marginBottom: theme.spacing.md,
		padding: theme.spacing.md,
		backgroundColor: theme.colors.surface,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: theme.colors.outline + "20",
	},
	messageHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: theme.spacing.sm,
	},
	messageAvatar: {
		marginRight: theme.spacing.sm,
		backgroundColor: theme.colors.primary,
	},
	messageInfo: {
		flex: 1,
	},
	messageSender: {
		fontWeight: "600",
		color: theme.colors.onSurface,
	},
	messageTime: {
		color: theme.colors.outline,
		marginTop: 2,
	},
	messageContent: {
		color: theme.colors.onSurface,
		lineHeight: 20,
		paddingLeft: 44, // Align with avatar
	},
	messageInputContainer: {
		borderTopWidth: 1,
		borderTopColor: theme.colors.outline + "20",
		paddingTop: theme.spacing.sm,
	},
	messageInput: {
		backgroundColor: theme.colors.surface,
		marginBottom: theme.spacing.xs,
	},
	characterCount: {
		textAlign: "right",
		color: theme.colors.outline,
	},
});
