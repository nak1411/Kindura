import React, { useState, useEffect, useRef, useCallback } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	Alert,
	Animated,
	KeyboardAvoidingView,
	Platform,
	FlatList,
	AppState,
	AppStateStatus,
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
	Snackbar,
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
	content: string;
	message_type: "text" | "nudge" | "system";
	created_at: string;
	timestamp?: string;
	user_name?: string;
}

interface ConnectionStatus {
	isConnected: boolean;
	lastCheck: Date;
	retryCount: number;
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
	const [loading, setLoading] = useState(true);
	const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
		isConnected: true,
		lastCheck: new Date(),
		retryCount: 0,
	});
	const [isRetrying, setIsRetrying] = useState(false);
	const [showConnectionError, setShowConnectionError] = useState(false);
	const [lastMessageId, setLastMessageId] = useState<string | null>(null);

	const { theme } = useTheme();

	// Refs
	const presenceAnimation = useRef(new Animated.Value(0)).current;
	const presenceInterval = useRef<NodeJS.Timeout | null>(null);
	const messagesListRef = useRef<FlatList>(null);
	const messageRefreshInterval = useRef<NodeJS.Timeout | null>(null);
	const connectionCheckInterval = useRef<NodeJS.Timeout | null>(null);
	const realtimeSubscription = useRef<any>(null);
	const appStateRef = useRef(AppState.currentState);

	// Connection monitoring
	const checkConnection = useCallback(async () => {
		try {
			const { error } = await supabase
				.from("parallel_rooms")
				.select("id")
				.eq("id", roomId)
				.single();

			const isConnected = !error;

			setConnectionStatus((prev) => ({
				...prev,
				isConnected,
				lastCheck: new Date(),
				retryCount: isConnected ? 0 : prev.retryCount + 1,
			}));

			if (!isConnected && connectionStatus.retryCount < 3) {
				setShowConnectionError(true);
				// Attempt to reconnect real-time subscription
				reconnectRealtime();
			}

			return isConnected;
		} catch (error) {
			console.error("Connection check failed:", error);
			setConnectionStatus((prev) => ({
				...prev,
				isConnected: false,
				lastCheck: new Date(),
				retryCount: prev.retryCount + 1,
			}));
			return false;
		}
	}, [roomId, connectionStatus.retryCount]);

	// Reconnect real-time subscription
	const reconnectRealtime = useCallback(() => {
		if (realtimeSubscription.current) {
			realtimeSubscription.current.unsubscribe();
		}
		setupRealtimeSubscription();
	}, []);

	// Setup real-time subscription with error handling
	const setupRealtimeSubscription = useCallback(() => {
		const subscription = supabase
			.channel(`room_${roomId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "room_messages",
					filter: `room_id=eq.${roomId}`,
				},
				(payload: any) => {
					console.log("New message received:", payload.new);
					handleNewMessage(payload.new as RoomMessage);
				}
			)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "parallel_rooms",
					filter: `id=eq.${roomId}`,
				},
				(payload: any) => {
					console.log("Room updated:", payload.new);
					setRoom(payload.new as ParallelRoom);
				}
			)
			.subscribe((status: string) => {
				console.log("Subscription status:", status);
				if (status === "SUBSCRIBED") {
					setConnectionStatus((prev) => ({
						...prev,
						isConnected: true,
						retryCount: 0,
					}));
					setShowConnectionError(false);
				} else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
					setConnectionStatus((prev) => ({ ...prev, isConnected: false }));
					setShowConnectionError(true);
				}
			});

		realtimeSubscription.current = subscription;
	}, [roomId]);

	// Handle new incoming messages
	const handleNewMessage = useCallback((newMsg: RoomMessage) => {
		setMessages((prev) => {
			// Check if message already exists to prevent duplicates
			const exists = prev.some((msg) => msg.id === newMsg.id);
			if (exists) return prev;

			const updated = [
				...prev,
				{
					...newMsg,
					timestamp: newMsg.created_at,
					user_name: newMsg.user_name || "Anonymous",
				},
			].sort(
				(a, b) =>
					new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
			);

			setLastMessageId(newMsg.id);

			// Auto-scroll to bottom for new messages
			setTimeout(() => {
				messagesListRef.current?.scrollToEnd({ animated: true });
			}, 100);

			return updated;
		});
	}, []);

	// Periodic message refresh
	const refreshMessages = useCallback(async () => {
		if (!connectionStatus.isConnected) return;

		try {
			const { data, error } = await supabase
				.from("room_messages")
				.select(
					`
					*,
					users:user_id (display_name)
				`
				)
				.eq("room_id", roomId)
				.order("created_at", { ascending: true })
				.limit(100); // Increased limit to get more message history

			if (error) throw error;

			const formattedMessages =
				data?.map((msg) => ({
					...msg,
					timestamp: msg.created_at,
					user_name: msg.users?.display_name || "Anonymous",
				})) || [];

			// Always update messages to ensure we have the latest data
			setMessages(formattedMessages);

			if (formattedMessages.length > 0) {
				const latestMessageId =
					formattedMessages[formattedMessages.length - 1]?.id;
				setLastMessageId(latestMessageId);

				// Auto-scroll to bottom after refresh
				setTimeout(() => {
					messagesListRef.current?.scrollToEnd({ animated: true });
				}, 100);
			}
		} catch (error) {
			console.error("Error refreshing messages:", error);
			setConnectionStatus((prev) => ({ ...prev, isConnected: false }));
		}
	}, [roomId, connectionStatus.isConnected]);

	// Retry mechanism for sending messages
	const sendMessageWithRetry = useCallback(
		async (content: string, retries = 3): Promise<boolean> => {
			if (!user || !content.trim()) return false;

			for (let attempt = 1; attempt <= retries; attempt++) {
				try {
					setIsRetrying(attempt > 1);

					// Always fetch fresh room data to avoid stale state
					const { data: freshRoomData, error: roomError } = await supabase
						.from("parallel_rooms")
						.select("current_participants")
						.eq("id", roomId)
						.single();

					if (roomError) {
						console.error("Failed to fetch room data:", roomError);
						throw new Error("Could not verify room membership");
					}

					if (!freshRoomData?.current_participants.includes(user.id)) {
						// User is not in room - try to rejoin automatically
						console.log("User not in room, attempting to rejoin...");

						const { data: roomToJoin, error: joinRoomError } = await supabase
							.from("parallel_rooms")
							.select("*")
							.eq("id", roomId)
							.single();

						if (!joinRoomError && roomToJoin) {
							// Check if room has space
							if (
								roomToJoin.current_participants.length < roomToJoin.max_capacity
							) {
								const updatedParticipants = [
									...roomToJoin.current_participants,
									user.id,
								];

								const { error: updateError } = await supabase
									.from("parallel_rooms")
									.update({ current_participants: updatedParticipants })
									.eq("id", roomId);

								if (!updateError) {
									console.log("Successfully rejoined room");
									// Update local state
									setRoom({
										...roomToJoin,
										current_participants: updatedParticipants,
									});
									// Continue with sending message
								} else {
									throw new Error("Failed to rejoin room");
								}
							} else {
								throw new Error("Room is full");
							}
						} else {
							throw new Error("You must be in the room to send messages");
						}
					}

					// Send the message
					const { error } = await supabase.from("room_messages").insert({
						room_id: roomId,
						user_id: user.id,
						content: content.trim(),
						message_type: "text",
					});

					if (error) throw error;

					// Success
					setIsRetrying(false);
					return true;
				} catch (error) {
					console.error(`Send message attempt ${attempt} failed:`, error);

					if (attempt === retries) {
						setIsRetrying(false);
						const errorMessage =
							error instanceof Error ? error.message : "Failed to send message";
						Alert.alert("Failed to send message", errorMessage, [
							{ text: "Cancel" },
							{
								text: "Retry",
								onPress: () => sendMessageWithRetry(content, 1),
							},
						]);
						return false;
					}

					// Wait before retry (exponential backoff)
					await new Promise((resolve) =>
						setTimeout(resolve, Math.pow(2, attempt) * 1000)
					);
				}
			}

			return false;
		},
		[user, roomId]
	);

	// Send message handler
	const sendMessage = useCallback(async () => {
		if (!newMessage.trim() || isRetrying) return;

		const messageContent = newMessage.trim();
		setNewMessage(""); // Clear input immediately for better UX

		const success = await sendMessageWithRetry(messageContent);

		if (success) {
			// Force refresh messages after successful send
			setTimeout(refreshMessages, 500);
		} else {
			// Restore message content if failed
			setNewMessage(messageContent);
		}
	}, [newMessage, isRetrying, sendMessageWithRetry, refreshMessages]);

	// App state change handler
	const handleAppStateChange = useCallback(
		(nextAppState: AppStateStatus) => {
			if (
				appStateRef.current.match(/inactive|background/) &&
				nextAppState === "active"
			) {
				// App came back to foreground - refresh everything
				console.log("App became active - refreshing data");
				checkConnection();
				refreshMessages();
				loadRoomData();
			}
			appStateRef.current = nextAppState;
		},
		[checkConnection, refreshMessages]
	);

	// Load room data
	const loadRoomData = useCallback(async () => {
		try {
			const {
				data: { user: authUser },
			} = await supabase.auth.getUser();

			if (!authUser) return;

			const { data: userData } = await supabase
				.from("users")
				.select("*")
				.eq("id", authUser.id)
				.single();

			setUser(userData);

			const { data: roomData, error } = await supabase
				.from("parallel_rooms")
				.select("*")
				.eq("id", roomId)
				.single();

			if (error) throw error;

			// Auto-join room if user is not in participants list
			if (userData && !roomData.current_participants.includes(userData.id)) {
				console.log("User not in room, auto-joining...");

				if (roomData.current_participants.length < roomData.max_capacity) {
					const updatedParticipants = [
						...roomData.current_participants,
						userData.id,
					];

					const { error: updateError } = await supabase
						.from("parallel_rooms")
						.update({ current_participants: updatedParticipants })
						.eq("id", roomId);

					if (!updateError) {
						roomData.current_participants = updatedParticipants;
						console.log("Successfully auto-joined room");
					} else {
						console.error("Failed to auto-join room:", updateError);
					}
				}
			}

			setRoom(roomData);

			if (roomData.current_participants.length > 0) {
				const { data: participantsData } = await supabase
					.from("users")
					.select("id, display_name, care_score, preferences")
					.in("id", roomData.current_participants);

				setParticipants(participantsData || []);
			}

			await refreshMessages();
		} catch (error) {
			console.error("Error loading room:", error);
			Alert.alert("Error", "Failed to load room data");
			navigation.goBack();
		} finally {
			setLoading(false);
		}
	}, [roomId, navigation, refreshMessages]);

	// Start presence timer
	const startPresenceTimer = useCallback(() => {
		setPresenceTimer(0);
		presenceInterval.current = setInterval(() => {
			setPresenceTimer((prev) => prev + 1);
		}, 1000);

		Animated.loop(
			Animated.sequence([
				Animated.timing(presenceAnimation, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: true,
				}),
				Animated.timing(presenceAnimation, {
					toValue: 0.5,
					duration: 1000,
					useNativeDriver: true,
				}),
			])
		).start();
	}, [presenceAnimation]);

	// Leave room handler
	const leaveRoom = useCallback(async () => {
		if (!user || !room) return;

		try {
			const updatedParticipants = room.current_participants.filter(
				(id) => id !== user.id
			);

			await supabase
				.from("parallel_rooms")
				.update({ current_participants: updatedParticipants })
				.eq("id", roomId);
		} catch (error) {
			console.error("Error leaving room:", error);
		}
	}, [user, room, roomId]);

	// Handle leave room button
	const handleLeaveRoom = useCallback(async () => {
		if (!user || !room) return;

		Alert.alert("Leave Room", "Are you sure you want to leave this room?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Leave",
				style: "destructive",
				onPress: async () => {
					await leaveRoom();
					navigation.goBack();
				},
			},
		]);
	}, [user, room, leaveRoom, navigation]);

	// Format helper functions
	const formatPresenceTime = useCallback((seconds: number) => {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	}, []);

	const formatMessageTime = useCallback((timestamp: string | undefined) => {
		if (!timestamp) return "";

		try {
			const date = new Date(timestamp);
			if (isNaN(date.getTime())) {
				return "";
			}
			return date.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch (error) {
			console.error("Error formatting time:", error);
			return "";
		}
	}, []);

	// Render message item
	const renderMessage = useCallback(
		({ item }: { item: RoomMessage }) => {
			const isOwnMessage = item.user_id === user?.id;

			return (
				<View
					style={[
						styles.messageItem,
						isOwnMessage ? styles.ownMessage : styles.otherMessage,
					]}
				>
					<Surface style={styles.messageContent}>
						<Text variant="labelSmall" style={{ color: theme.colors.primary }}>
							{isOwnMessage ? "You" : item.user_name || "Anonymous"}
						</Text>
						<Text style={styles.messageText}>{item.content}</Text>
						<Text style={styles.messageTime}>
							{formatMessageTime(item.timestamp || item.created_at)}
						</Text>
					</Surface>
				</View>
			);
		},
		[user?.id, theme.colors.primary, formatMessageTime]
	);

	// Main useEffect
	useEffect(() => {
		loadRoomData();
		startPresenceTimer();
		setupRealtimeSubscription();

		// Set up intervals
		messageRefreshInterval.current = setInterval(refreshMessages, 15000); // Refresh every 15 seconds (more frequent)
		connectionCheckInterval.current = setInterval(checkConnection, 30000); // Check connection every 30 seconds

		// App state listener
		const subscription = AppState.addEventListener(
			"change",
			handleAppStateChange
		);

		return () => {
			// Cleanup
			if (presenceInterval.current) {
				clearInterval(presenceInterval.current);
			}
			if (messageRefreshInterval.current) {
				clearInterval(messageRefreshInterval.current);
			}
			if (connectionCheckInterval.current) {
				clearInterval(connectionCheckInterval.current);
			}
			if (realtimeSubscription.current) {
				realtimeSubscription.current.unsubscribe();
			}
			subscription?.remove();
			leaveRoom();
		};
	}, []);

	// Styles
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
		backButton: {
			margin: 0,
		},
		headerCenter: {
			flex: 1,
			alignItems: "center",
		},
		roomTitle: {
			color: theme.colors.primary,
			fontWeight: "bold",
		},
		presenceTime: {
			color: theme.colors.outline,
			marginTop: 4,
		},
		scrollContent: {
			flex: 1,
		},
		participantsSection: {
			backgroundColor: theme.colors.surface,
			paddingHorizontal: 16,
			paddingVertical: 8,
			borderBottomWidth: 1,
			borderBottomColor: theme.colors.outline + "20",
		},
		participantsContent: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "space-between",
		},
		participantsLabel: {
			color: theme.colors.primary,
			fontWeight: "500",
		},
		infoSection: {
			padding: 16,
		},
		participantsCard: {
			marginBottom: 16,
			backgroundColor: theme.colors.surface,
		},
		sectionTitle: {
			color: theme.colors.primary,
			fontWeight: "bold",
			marginBottom: 12,
		},
		participantsList: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 4,
		},
		participantAvatar: {
			backgroundColor: theme.colors.primaryContainer,
		},
		messagesContainer: {
			flex: 1,
			backgroundColor: theme.colors.surface,
		},
		messagesHeader: {
			padding: 16,
			paddingBottom: 8,
			borderBottomWidth: 1,
			borderBottomColor: theme.colors.outline + "20",
		},
		messagesList: {
			flex: 1,
			paddingHorizontal: 16,
		},
		messageItem: {
			marginVertical: 4,
		},
		ownMessage: {
			alignItems: "flex-end",
		},
		otherMessage: {
			alignItems: "flex-start",
		},
		messageContent: {
			maxWidth: "80%",
			padding: 12,
			borderRadius: 12,
			backgroundColor: theme.colors.surfaceVariant,
		},
		messageText: {
			color: theme.colors.onSurface,
			marginVertical: 4,
		},
		messageTime: {
			color: theme.colors.outline,
			fontSize: 12,
			marginTop: 4,
		},
		inputContainer: {
			padding: 16,
			backgroundColor: theme.colors.surface,
			borderTopWidth: 1,
			borderTopColor: theme.colors.outline + "20",
		},
		messageInput: {
			backgroundColor: theme.colors.background,
		},
		emptyMessages: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			padding: 32,
		},
		emptyText: {
			color: theme.colors.outline,
			textAlign: "center",
			marginTop: 16,
		},
		connectionStatus: {
			flexDirection: "row",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 8,
		},
		connectionIndicator: {
			width: 8,
			height: 8,
			borderRadius: 4,
			marginRight: 8,
		},
		connected: {
			backgroundColor: "#4CAF50",
		},
		disconnected: {
			backgroundColor: "#F44336",
		},
		connectionText: {
			fontSize: 12,
			color: theme.colors.outline,
		},
	});

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<Text>Loading room...</Text>
			</View>
		);
	}

	if (!room) {
		return (
			<View style={styles.loadingContainer}>
				<Text>Room not found</Text>
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
					<IconButton
						icon="arrow-left"
						onPress={() => navigation.goBack()}
						style={styles.backButton}
					/>
					<View style={styles.headerCenter}>
						<Text variant="headlineSmall" style={styles.roomTitle}>
							{room.name}
						</Text>
						<Text variant="bodySmall" style={styles.presenceTime}>
							Present for {formatPresenceTime(presenceTimer)}
						</Text>
					</View>
					<Button
						mode="outlined"
						onPress={handleLeaveRoom}
						compact
						style={{ borderRadius: 8 }}
					>
						Leave
					</Button>
				</View>

				{/* Connection Status Indicator */}
				<View style={styles.connectionStatus}>
					<View
						style={[
							styles.connectionIndicator,
							connectionStatus.isConnected
								? styles.connected
								: styles.disconnected,
						]}
					/>
					<Text style={styles.connectionText}>
						{connectionStatus.isConnected ? "Connected" : "Reconnecting..."}
					</Text>
				</View>
			</Surface>

			{/* Participants Section - Compact */}
			{participants.length > 0 && (
				<Surface style={styles.participantsSection}>
					<View style={styles.participantsContent}>
						<Text variant="bodySmall" style={styles.participantsLabel}>
							Users ({participants.length}):
						</Text>
						<View style={styles.participantsList}>
							{participants.map((participant) => (
								<Avatar.Text
									key={participant.id}
									size={24}
									label={participant.display_name.charAt(0).toUpperCase()}
									style={styles.participantAvatar}
								/>
							))}
						</View>
					</View>
				</Surface>
			)}

			{/* Messages Section - Takes up most space */}
			<Surface style={styles.messagesContainer}>
				<View style={styles.messagesHeader}>
					<Text variant="titleSmall" style={styles.sectionTitle}>
						Chat
					</Text>
				</View>

				{messages.length > 0 ? (
					<FlatList
						ref={messagesListRef}
						data={messages}
						renderItem={renderMessage}
						keyExtractor={(item) => item.id}
						style={styles.messagesList}
						contentContainerStyle={{ paddingVertical: 16 }}
						showsVerticalScrollIndicator={false}
					/>
				) : (
					<View style={styles.emptyMessages}>
						<IconButton
							icon="message-text-outline"
							size={48}
							iconColor={theme.colors.outline}
						/>
						<Text style={styles.emptyText}>
							No messages yet.{"\n"}Send a message to connect with others.
						</Text>
					</View>
				)}

				{/* Message Input */}
				<Surface style={styles.inputContainer}>
					<TextInput
						value={newMessage}
						onChangeText={setNewMessage}
						placeholder={isRetrying ? "Sending..." : "Send a message..."}
						style={styles.messageInput}
						multiline
						disabled={isRetrying || !connectionStatus.isConnected}
						right={
							<TextInput.Icon
								icon={isRetrying ? "loading" : "send"}
								onPress={sendMessage}
								disabled={
									!newMessage.trim() ||
									isRetrying ||
									!connectionStatus.isConnected
								}
							/>
						}
						onSubmitEditing={sendMessage}
					/>
				</Surface>
			</Surface>

			{/* Connection Error Snackbar */}
			<Snackbar
				visible={showConnectionError}
				onDismiss={() => setShowConnectionError(false)}
				duration={5000}
				action={{
					label: "Retry",
					onPress: () => {
						checkConnection();
						refreshMessages();
					},
				}}
			>
				Connection lost. Messages may not sync.
			</Snackbar>
		</KeyboardAvoidingView>
	);
}
