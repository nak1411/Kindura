import React, { useState, useEffect, useRef } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	Alert,
	Animated,
	KeyboardAvoidingView,
	Platform,
	FlatList,
} from "react-native";
import {
	Text,
	Card,
	Button,
	Avatar,
	IconButton,
	Surface,
	ProgressBar,
	TextInput,
	Chip,
} from "react-native-paper";
import { supabase } from "../../services/supabase";
import { useTheme } from "../../constants/theme-context";
import { ParallelRoom, User } from "../../types";

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

interface RoomMessage {
	id: string;
	room_id: string;
	user_id: string;
	content: string; // Changed from 'message' to 'content'
	message_type: "text" | "gentle_nudge" | "system";
	timestamp: string;
	user_name?: string; // Add this as optional since it might not be in DB
}

export default function RoomDetailScreen({
	route,
	navigation,
}: RoomDetailScreenProps) {
	const { roomId } = route.params;
	const [room, setRoom] = useState<ParallelRoom | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [participants, setParticipants] = useState<RoomParticipant[]>([]);
	const [messages, setMessages] = useState<RoomMessage[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [presenceTimer, setPresenceTimer] = useState(0);
	const [ambientSoundPlaying, setAmbientSoundPlaying] = useState(false);
	const [loading, setLoading] = useState(true);
	const { theme } = useTheme();

	const presenceAnimation = useRef(new Animated.Value(0)).current;
	const presenceInterval = useRef<NodeJS.Timeout | null>(null);
	const messagesListRef = useRef<FlatList>(null);

	// Move styles to top of component
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
			backgroundColor: theme.colors.surface,
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
		scrollContent: {
			flexGrow: 0,
			maxHeight: 120, // Much smaller info section
		},
		infoSection: {
			paddingHorizontal: 16,
			paddingVertical: 8, // Reduced padding
		},
		presenceCard: {
			marginBottom: 8,
			backgroundColor: theme.colors.primaryContainer,
		},
		presenceHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 4,
		},
		presenceIndicator: {
			width: 8,
			height: 8,
			borderRadius: 4,
			backgroundColor: theme.colors.primary,
			marginRight: 8,
		},
		presenceDescription: {
			color: theme.colors.onPrimaryContainer,
			fontSize: 14,
		},
		participantsCard: {
			backgroundColor: theme.colors.surface,
			marginBottom: 8,
		},
		sectionTitle: {
			color: theme.colors.primary,
			marginBottom: 6,
			fontSize: 14,
		},
		participantsList: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 6,
		},
		participantItem: {
			alignItems: "center",
			marginBottom: 2,
		},
		participantAvatar: {
			marginBottom: 2,
		},
		descriptionCard: {
			backgroundColor: theme.colors.surface,
			marginBottom: 8,
		},
		promptCard: {
			backgroundColor: theme.colors.surfaceVariant,
			marginBottom: 8,
		},
		chatContainer: {
			flex: 1,
			backgroundColor: theme.colors.surface,
			marginHorizontal: 16,
			marginBottom: 16,
			borderRadius: 12,
			minHeight: 400, // Ensure good minimum height for chat
		},
		chatHeader: {
			padding: 8,
			borderBottomWidth: 1,
			borderBottomColor: theme.colors.outline,
		},
		chatTitle: {
			color: theme.colors.primary,
			fontSize: 14,
		},
		chatSubtitle: {
			color: theme.colors.outline,
			marginTop: 2,
			fontSize: 12,
		},
		messagesList: {
			flex: 1,
			paddingHorizontal: 12,
			minHeight: 250, // Ensure messages area is visible
		},
		messageItem: {
			marginVertical: 6,
		},
		messageHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 2,
		},
		messageSender: {
			color: theme.colors.primary,
			fontWeight: "600",
			marginRight: 8,
			fontSize: 13,
		},
		messageTime: {
			color: theme.colors.outline,
			fontSize: 11,
		},
		messageText: {
			color: theme.colors.onSurface,
			lineHeight: 18,
			fontSize: 14,
		},
		systemMessage: {
			alignSelf: "center",
			backgroundColor: theme.colors.surfaceVariant,
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 8,
			marginVertical: 2,
		},
		systemMessageText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 11,
			fontStyle: "italic",
		},
		gentleNudgeMessage: {
			backgroundColor: theme.colors.primaryContainer,
			paddingHorizontal: 8,
			paddingVertical: 6,
			borderRadius: 8,
			alignSelf: "flex-start",
			marginVertical: 2,
		},
		gentleNudgeText: {
			color: theme.colors.onPrimaryContainer,
			fontStyle: "italic",
			fontSize: 13,
		},
		inputContainer: {
			flexDirection: "row",
			padding: 8,
			backgroundColor: theme.colors.surface,
			borderTopWidth: 1,
			borderTopColor: theme.colors.outline,
			alignItems: "center",
		},
		textInput: {
			flex: 1,
			marginHorizontal: 6,
			maxHeight: 60, // Reduced height
		},
		sendButton: {
			borderRadius: 16,
			minWidth: 50,
		},
		nudgeButton: {
			borderRadius: 16,
			minWidth: 35,
		},
		actionButtons: {
			flexDirection: "row",
			padding: 8,
			backgroundColor: theme.colors.surface,
			elevation: 8,
		},
		leaveButton: {
			flex: 1,
		},
	});

	useEffect(() => {
		loadInitialData();
		const unsubscribe = setupRealtimeSubscriptions();
		startPresenceTimer();

		return () => {
			if (presenceInterval.current) clearInterval(presenceInterval.current);
			unsubscribe();
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
				await loadParticipants(roomData.current_participants);
			}

			// Load recent messages
			await loadMessages();
		} catch (error) {
			console.error("Error loading room data:", error);
			Alert.alert("Error", "Failed to load room details");
		} finally {
			setLoading(false);
		}
	};

	const setupRealtimeSubscriptions = () => {
		console.log("Setting up realtime subscriptions for room:", roomId);

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
					console.log("Room update received:", payload);
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
					console.log("New message received via realtime:", payload);

					// Get the user name for this message
					const { data: userData } = await supabase
						.from("users")
						.select("display_name")
						.eq("id", payload.new.user_id)
						.single();

					const newMessage = {
						id: payload.new.id,
						room_id: payload.new.room_id,
						user_id: payload.new.user_id,
						content: payload.new.content || "",
						message_type: payload.new.message_type || "text",
						timestamp: payload.new.created_at || new Date().toISOString(),
						user_name: userData?.display_name || "Unknown",
					};

					console.log("Adding message to state:", newMessage);
					setMessages((prev) => {
						// Check if message already exists (prevent duplicates)
						const exists = prev.find((msg) => msg.id === newMessage.id);
						if (exists) {
							console.log("Message already exists, skipping");
							return prev;
						}
						console.log("Adding new message to list");
						return [...prev, newMessage];
					});

					// Scroll to bottom when new message arrives
					setTimeout(() => {
						messagesListRef.current?.scrollToEnd({ animated: true });
					}, 100);
				}
			)
			.subscribe((status) => {
				console.log("Subscription status:", status);
			});

		return () => {
			console.log("Unsubscribing from realtime");
			roomSubscription.unsubscribe();
		};
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

	const loadMessages = async () => {
		const { data: messagesData } = await supabase
			.from("room_messages")
			.select("id, room_id, user_id, content, message_type, created_at")
			.eq("room_id", roomId)
			.order("created_at", { ascending: true })
			.limit(50);

		if (messagesData && messagesData.length > 0) {
			// Get unique user IDs
			const userIds = [...new Set(messagesData.map((msg) => msg.user_id))];

			// Fetch user names
			const { data: usersData } = await supabase
				.from("users")
				.select("id, display_name")
				.in("id", userIds);

			// Create user lookup map
			const userMap = new Map();
			usersData?.forEach((user) => {
				userMap.set(user.id, user.display_name);
			});

			// Transform messages with user names
			const transformedMessages = messagesData.map((msg) => ({
				id: msg.id,
				room_id: msg.room_id,
				user_id: msg.user_id,
				content: msg.content || "",
				message_type: msg.message_type || "text",
				timestamp: msg.created_at || new Date().toISOString(),
				user_name: userMap.get(msg.user_id) || "Unknown",
			}));

			setMessages(transformedMessages);
		}

		// Scroll to bottom after loading messages
		setTimeout(() => {
			messagesListRef.current?.scrollToEnd({ animated: false });
		}, 100);
	};

	const sendMessage = async () => {
		if (!newMessage.trim() || !user) return;

		try {
			console.log("Sending message:", {
				room_id: roomId,
				user_id: user.id,
				content: newMessage.trim(),
				message_type: "text",
			});

			const { data, error } = await supabase
				.from("room_messages")
				.insert([
					{
						room_id: roomId,
						user_id: user.id,
						content: newMessage.trim(),
						message_type: "text",
					},
				])
				.select();

			if (error) {
				console.error("Supabase error:", error);
				throw error;
			}

			console.log("Message sent successfully:", data);
			setNewMessage("");

			// Manually add the message to state as a fallback if realtime is slow
			if (data && data[0]) {
				const sentMessage = {
					id: data[0].id,
					room_id: data[0].room_id,
					user_id: data[0].user_id,
					content: data[0].content,
					message_type: data[0].message_type,
					timestamp: data[0].created_at,
					user_name: user.display_name,
				};

				console.log("Adding sent message to state immediately:", sentMessage);
				setMessages((prev) => {
					// Check if message already exists
					const exists = prev.find((msg) => msg.id === sentMessage.id);
					if (exists) return prev;
					return [...prev, sentMessage];
				});

				// Scroll to bottom
				setTimeout(() => {
					messagesListRef.current?.scrollToEnd({ animated: true });
				}, 100);
			}
		} catch (error) {
			console.error("Error sending message:", error);
			Alert.alert("Error", "Failed to send message. Please try again.");
		}
	};

	const sendGentleNudge = async () => {
		if (!user) return;

		try {
			console.log("Sending gentle nudge");
			const { data, error } = await supabase
				.from("room_messages")
				.insert([
					{
						room_id: roomId,
						user_id: user.id,
						content: "sent a gentle wave ✨", // Changed from 'message' to 'content'
						message_type: "gentle_nudge",
					},
				])
				.select();

			if (error) {
				console.error("Gentle nudge error:", error);
				throw error;
			}

			console.log("Gentle nudge sent:", data);
		} catch (error) {
			console.error("Error sending gentle nudge:", error);
			Alert.alert("Error", "Failed to send gentle nudge");
		}
	};

	const toggleAmbientSound = () => {
		setAmbientSoundPlaying(!ambientSoundPlaying);
	};

	const leaveRoom = async () => {
		if (!user || !room) return;

		Alert.alert(
			"Leave Room",
			"Are you sure you want to leave this peaceful space?",
			[
				{ text: "Stay", style: "cancel" },
				{
					text: "Leave Quietly",
					onPress: async () => {
						try {
							const updatedParticipants = room.current_participants.filter(
								(id) => id !== user.id
							);

							await supabase
								.from("parallel_rooms")
								.update({ current_participants: updatedParticipants })
								.eq("id", roomId);

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

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const formatMessageTime = (timestamp: string) => {
		try {
			if (!timestamp) return "";
			const date = new Date(timestamp);
			// Check if date is valid
			if (isNaN(date.getTime())) {
				console.warn("Invalid timestamp:", timestamp);
				return "";
			}
			return date.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch (error) {
			console.warn("Error formatting time:", error, timestamp);
			return "";
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

	const renderMessage = ({ item }: { item: RoomMessage }) => {
		// Safety checks
		if (!item || !item.id) {
			console.warn("Invalid message item:", item);
			return null;
		}

		if (item.message_type === "system") {
			return (
				<View key={item.id} style={styles.systemMessage}>
					<Text style={styles.systemMessageText}>
						{item.content || "System message"}
					</Text>
				</View>
			);
		}

		if (item.message_type === "gentle_nudge") {
			return (
				<View
					key={item.id}
					style={[styles.messageItem, styles.gentleNudgeMessage]}
				>
					<Text style={styles.gentleNudgeText}>
						{item.user_name || "Someone"}{" "}
						{item.content || "sent a gentle wave ✨"}
					</Text>
				</View>
			);
		}

		// Regular text message
		return (
			<View key={item.id} style={styles.messageItem}>
				<View style={styles.messageHeader}>
					<Text style={styles.messageSender}>
						{item.user_name || "Anonymous"}
					</Text>
					<Text style={styles.messageTime}>
						{formatMessageTime(item.timestamp)}
					</Text>
				</View>
				<Text style={styles.messageText}>{item.content || ""}</Text>
			</View>
		);
	};

	if (loading || !room) {
		return (
			<View style={styles.loadingContainer}>
				<Text style={{ color: theme.colors.onBackground }}>
					Loading room...
				</Text>
			</View>
		);
	}

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : "height"}
		>
			{/* Header */}
			<Surface style={styles.header}>
				<View style={styles.headerContent}>
					<View style={styles.headerLeft}>
						<Text variant="titleLarge" style={styles.roomTitle}>
							{getRoomIcon(room.room_type)} {room.name}
						</Text>
						<Text variant="bodySmall" style={styles.presenceTime}>
							Present for {formatTime(presenceTimer)}
						</Text>
					</View>
					<IconButton
						icon="close"
						size={24}
						onPress={() => navigation.goBack()}
						style={styles.closeButton}
					/>
				</View>
			</Surface>

			{/* Compact info section showing participants */}
			<View style={styles.infoSection}>
				<Card style={styles.participantsCard}>
					<Card.Content>
						<Text variant="titleSmall" style={styles.sectionTitle}>
							Present Souls ({participants.length})
						</Text>
						<View style={styles.participantsList}>
							{participants.map((participant) => (
								<View key={participant.id} style={styles.participantItem}>
									<Avatar.Text
										size={24}
										label={participant.display_name.charAt(0).toUpperCase()}
										style={styles.participantAvatar}
									/>
									<Text
										variant="bodySmall"
										style={{ color: theme.colors.onSurface, fontSize: 10 }}
									>
										{participant.display_name}
									</Text>
								</View>
							))}
						</View>
					</Card.Content>
				</Card>
			</View>

			{/* Main Chat Area */}
			<Card style={styles.chatContainer}>
				<View style={styles.chatHeader}>
					<Text variant="titleMedium" style={styles.chatTitle}>
						💬 Room Chat
					</Text>
					<Text variant="bodySmall" style={styles.chatSubtitle}>
						Share thoughts gently
					</Text>
				</View>

				<FlatList
					ref={messagesListRef}
					data={messages}
					renderItem={renderMessage}
					keyExtractor={(item) => item.id}
					style={styles.messagesList}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{ paddingVertical: 8 }}
					ListEmptyComponent={
						<View
							style={{
								flex: 1,
								justifyContent: "center",
								alignItems: "center",
								paddingVertical: 40,
							}}
						>
							<Text
								style={{ color: theme.colors.outline, fontStyle: "italic" }}
							>
								No messages yet. Start a gentle conversation...
							</Text>
						</View>
					}
				/>

				{/* Compact Input */}
				<View style={styles.inputContainer}>
					<Button
						mode="text"
						onPress={sendGentleNudge}
						style={styles.nudgeButton}
						compact
						contentStyle={{ paddingHorizontal: 4 }}
					>
						✨
					</Button>
					<TextInput
						style={styles.textInput}
						value={newMessage}
						onChangeText={setNewMessage}
						placeholder="Type a message..."
						multiline
						mode="outlined"
						dense
						contentStyle={{ paddingVertical: 6 }}
					/>
					<Button
						mode="contained"
						onPress={sendMessage}
						disabled={!newMessage.trim()}
						style={styles.sendButton}
						compact
						contentStyle={{ paddingHorizontal: 8 }}
					>
						Send
					</Button>
				</View>
			</Card>

			{/* Action Buttons */}
			<Surface style={styles.actionButtons}>
				<Button
					mode="contained"
					onPress={leaveRoom}
					style={styles.leaveButton}
					icon="exit-to-app"
				>
					Leave Quietly
				</Button>
			</Surface>
		</KeyboardAvoidingView>
	);
}
