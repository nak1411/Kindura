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
	content: string;
	message_type: "text" | "gentle_nudge" | "system";
	created_at: string;
	timestamp?: string; // For backward compatibility
	user_name?: string;
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
	const { theme } = useTheme();

	const presenceAnimation = useRef(new Animated.Value(0)).current;
	const presenceInterval = useRef<NodeJS.Timeout | null>(null);
	const messagesListRef = useRef<FlatList>(null);

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
			flexGrow: 0,
			maxHeight: 120,
		},
		infoSection: {
			paddingHorizontal: 16,
			paddingVertical: 8,
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
			marginBottom: 8,
		},
		participantsList: {
			flexDirection: "row",
			flexWrap: "wrap",
			gap: 8,
		},
		participantAvatar: {
			marginBottom: 4,
		},
		messagesContainer: {
			flex: 1,
			backgroundColor: theme.colors.surface,
		},
		messagesHeader: {
			padding: 16,
			borderBottomWidth: 1,
			borderBottomColor: theme.colors.outline + "20",
		},
		messagesList: {
			flex: 1,
			paddingHorizontal: 16,
		},
		messageItem: {
			marginVertical: 4,
			maxWidth: "85%",
		},
		ownMessage: {
			alignSelf: "flex-end",
			backgroundColor: theme.colors.primaryContainer,
		},
		otherMessage: {
			alignSelf: "flex-start",
			backgroundColor: theme.colors.surfaceVariant,
		},
		messageContent: {
			padding: 12,
			borderRadius: 16,
		},
		messageText: {
			color: theme.colors.onSurface,
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
	});

	useEffect(() => {
		loadRoomData();
		startPresenceTimer();

		return () => {
			if (presenceInterval.current) {
				clearInterval(presenceInterval.current);
			}
			leaveRoom();
		};
	}, []);

	const loadRoomData = async () => {
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
			setRoom(roomData);

			if (roomData.current_participants.length > 0) {
				const { data: participantsData } = await supabase
					.from("users")
					.select("id, display_name, care_score, preferences")
					.in("id", roomData.current_participants);

				setParticipants(participantsData || []);
			}

			loadMessages();
		} catch (error) {
			console.error("Error loading room:", error);
			Alert.alert("Error", "Failed to load room data");
			navigation.goBack();
		} finally {
			setLoading(false);
		}
	};

	const loadMessages = async () => {
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
				.limit(50);

			if (error) throw error;

			const formattedMessages =
				data?.map((msg) => ({
					...msg,
					timestamp: msg.created_at, // Map created_at to timestamp for consistency
					user_name: msg.users?.display_name || "Anonymous",
				})) || [];

			setMessages(formattedMessages);

			setTimeout(() => {
				messagesListRef.current?.scrollToEnd({ animated: true });
			}, 100);
		} catch (error) {
			console.error("Error loading messages:", error);
		}
	};

	const startPresenceTimer = () => {
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
	};

	const handleLeaveRoom = async () => {
		if (!user || !room) return;

		Alert.alert("Leave Room", "Are you sure you want to leave this room?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Leave",
				style: "destructive",
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
		]);
	};

	const leaveRoom = async () => {
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
	};

	const sendMessage = async () => {
		if (!newMessage.trim() || !user) return;

		try {
			const { error } = await supabase.from("room_messages").insert({
				room_id: roomId,
				user_id: user.id,
				content: newMessage.trim(),
				message_type: "text",
			});

			if (error) throw error;

			setNewMessage("");
			loadMessages();
		} catch (error) {
			console.error("Error sending message:", error);
			Alert.alert("Error", "Failed to send message");
		}
	};

	const formatPresenceTime = (seconds: number) => {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	};

	const formatMessageTime = (timestamp: string | undefined) => {
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
	};

	const renderMessage = ({ item }: { item: RoomMessage }) => {
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
	};

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
					<Button mode="outlined" onPress={handleLeaveRoom} compact>
						Leave
					</Button>
				</View>
			</Surface>

			{/* Info Section */}
			<ScrollView
				style={styles.scrollContent}
				contentContainerStyle={styles.infoSection}
				showsVerticalScrollIndicator={false}
			>
				{/* Participants */}
				{participants.length > 0 && (
					<Card style={styles.participantsCard}>
						<Card.Content>
							<Text variant="titleSmall" style={styles.sectionTitle}>
								Present ({participants.length})
							</Text>
							<View style={styles.participantsList}>
								{participants.map((participant) => (
									<Avatar.Text
										key={participant.id}
										size={32}
										label={participant.display_name.charAt(0).toUpperCase()}
										style={styles.participantAvatar}
									/>
								))}
							</View>
						</Card.Content>
					</Card>
				)}
			</ScrollView>

			{/* Messages Section */}
			<Surface style={styles.messagesContainer}>
				<View style={styles.messagesHeader}>
					<Text variant="titleSmall" style={styles.sectionTitle}>
						Gentle Messages
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
							No messages yet.{"\n"}Send a gentle message to connect with
							others.
						</Text>
					</View>
				)}

				{/* Message Input */}
				<Surface style={styles.inputContainer}>
					<TextInput
						value={newMessage}
						onChangeText={setNewMessage}
						placeholder="Send a gentle message..."
						style={styles.messageInput}
						multiline
						right={
							<TextInput.Icon
								icon="send"
								onPress={sendMessage}
								disabled={!newMessage.trim()}
							/>
						}
						onSubmitEditing={sendMessage}
					/>
				</Surface>
			</Surface>
		</KeyboardAvoidingView>
	);
}
