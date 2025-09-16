import { supabase } from "../services/supabase";
import { ParallelRoom, User } from "../types";

export interface RoomParticipant {
	id: string;
	display_name: string;
	care_score: number;
	preferences: User["preferences"];
}

export interface RoomActivity {
	id: string;
	room_id: string;
	activity_type: "breathing" | "meditation" | "focus_timer" | "gentle_check_in";
	duration_minutes: number;
	participants: string[];
	status: "waiting" | "active" | "completed" | "cancelled";
	started_at?: string;
	completed_at?: string;
	created_at: string;
}

export interface RoomMessage {
	id: string;
	room_id: string;
	user_id: string;
	content: string;
	message_type: "text" | "gentle_nudge" | "reflection" | "presence_update";
	created_at: string;
	user?: Pick<User, "id" | "display_name">;
}

export interface RoomPresence {
	id: string;
	room_id: string;
	user_id: string;
	joined_at: string;
	left_at?: string;
	total_minutes: number;
	last_activity: string;
}

export interface RoomSettings {
	id: string;
	room_id: string;
	allow_messages: boolean;
	allow_activities: boolean;
	message_cooldown_minutes: number;
	max_messages_per_hour: number;
	gentle_mode: boolean;
	auto_ambient_sound: boolean;
	prompt_rotation_hours: number;
}

// Room Management Functions
export const roomUtils = {
	// Get room with participants
	async getRoomWithParticipants(
		roomId: string
	): Promise<{ room: ParallelRoom; participants: RoomParticipant[] } | null> {
		try {
			const { data: room, error: roomError } = await supabase
				.from("parallel_rooms")
				.select("*")
				.eq("id", roomId)
				.single();

			if (roomError || !room) return null;

			let participants: RoomParticipant[] = [];
			if (room.current_participants.length > 0) {
				const { data: participantData } = await supabase
					.from("users")
					.select("id, display_name, care_score, preferences")
					.in("id", room.current_participants);

				participants = participantData || [];
			}

			return { room, participants };
		} catch (error) {
			console.error("Error fetching room with participants:", error);
			return null;
		}
	},

	// Join a room
	async joinRoom(
		roomId: string,
		userId: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			const { data: room, error: fetchError } = await supabase
				.from("parallel_rooms")
				.select("*")
				.eq("id", roomId)
				.single();

			if (fetchError || !room) {
				return { success: false, error: "Room not found" };
			}

			if (room.current_participants.includes(userId)) {
				return { success: true }; // Already in room
			}

			if (room.current_participants.length >= room.max_capacity) {
				return { success: false, error: "Room is at capacity" };
			}

			const updatedParticipants = [...room.current_participants, userId];

			const { error: updateError } = await supabase
				.from("parallel_rooms")
				.update({ current_participants: updatedParticipants })
				.eq("id", roomId);

			if (updateError) {
				return { success: false, error: updateError.message };
			}

			return { success: true };
		} catch (error) {
			console.error("Error joining room:", error);
			return { success: false, error: "Failed to join room" };
		}
	},

	// Leave a room
	async leaveRoom(
		roomId: string,
		userId: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			const { data: room, error: fetchError } = await supabase
				.from("parallel_rooms")
				.select("*")
				.eq("id", roomId)
				.single();

			if (fetchError || !room) {
				return { success: false, error: "Room not found" };
			}

			const updatedParticipants = room.current_participants.filter(
				(id: string) => id !== userId
			);

			const { error: updateError } = await supabase
				.from("parallel_rooms")
				.update({ current_participants: updatedParticipants })
				.eq("id", roomId);

			if (updateError) {
				return { success: false, error: updateError.message };
			}

			// Record interaction for care score
			await supabase.from("user_interactions").insert({
				user_id: userId,
				interaction_type: "room_participated",
				points: 1,
			});

			return { success: true };
		} catch (error) {
			console.error("Error leaving room:", error);
			return { success: false, error: "Failed to leave room" };
		}
	},

	// Get room messages
	async getRoomMessages(
		roomId: string,
		limit: number = 20
	): Promise<RoomMessage[]> {
		try {
			const { data, error } = await supabase
				.from("room_messages")
				.select(
					`
					*,
					user:users(id, display_name)
				`
				)
				.eq("room_id", roomId)
				.order("created_at", { ascending: false })
				.limit(limit);

			if (error) {
				console.error("Error fetching messages:", error);
				return [];
			}

			return data || [];
		} catch (error) {
			console.error("Error fetching room messages:", error);
			return [];
		}
	},

	// Send a message
	async sendMessage(
		roomId: string,
		userId: string,
		content: string,
		messageType: RoomMessage["message_type"] = "text"
	): Promise<{ success: boolean; error?: string }> {
		try {
			// Check if user is in the room
			const { data: room } = await supabase
				.from("parallel_rooms")
				.select("current_participants")
				.eq("id", roomId)
				.single();

			if (!room || !room.current_participants.includes(userId)) {
				return {
					success: false,
					error: "You must be in the room to send messages",
				};
			}

			const { error } = await supabase.from("room_messages").insert({
				room_id: roomId,
				user_id: userId,
				content: content.trim(),
				message_type: messageType,
			});

			if (error) {
				return { success: false, error: error.message };
			}

			return { success: true };
		} catch (error) {
			console.error("Error sending message:", error);
			return { success: false, error: "Failed to send message" };
		}
	},

	// Get room activities
	async getRoomActivities(roomId: string): Promise<RoomActivity[]> {
		try {
			const { data, error } = await supabase
				.from("room_activities")
				.select("*")
				.eq("room_id", roomId)
				.in("status", ["waiting", "active"])
				.order("created_at", { ascending: false });

			if (error) {
				console.error("Error fetching activities:", error);
				return [];
			}

			return data || [];
		} catch (error) {
			console.error("Error fetching room activities:", error);
			return [];
		}
	},

	// Start an activity
	async startActivity(
		roomId: string,
		userId: string,
		activityType: RoomActivity["activity_type"],
		durationMinutes: number
	): Promise<{ success: boolean; activityId?: string; error?: string }> {
		try {
			// Check if user is in the room
			const { data: room } = await supabase
				.from("parallel_rooms")
				.select("current_participants")
				.eq("id", roomId)
				.single();

			if (!room || !room.current_participants.includes(userId)) {
				return {
					success: false,
					error: "You must be in the room to start activities",
				};
			}

			const { data, error } = await supabase
				.from("room_activities")
				.insert({
					room_id: roomId,
					activity_type: activityType,
					duration_minutes: durationMinutes,
					participants: [userId],
					status: "waiting",
				})
				.select()
				.single();

			if (error) {
				return { success: false, error: error.message };
			}

			return { success: true, activityId: data.id };
		} catch (error) {
			console.error("Error starting activity:", error);
			return { success: false, error: "Failed to start activity" };
		}
	},

	// Join an activity
	async joinActivity(
		activityId: string,
		userId: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			const { data: activity, error: fetchError } = await supabase
				.from("room_activities")
				.select("*")
				.eq("id", activityId)
				.single();

			if (fetchError || !activity) {
				return { success: false, error: "Activity not found" };
			}

			if (activity.participants.includes(userId)) {
				return { success: true }; // Already participating
			}

			const updatedParticipants = [...activity.participants, userId];
			const shouldStart =
				activity.status === "waiting" && updatedParticipants.length >= 2;

			const updateData: any = {
				participants: updatedParticipants,
			};

			if (shouldStart) {
				updateData.status = "active";
				updateData.started_at = new Date().toISOString();
			}

			const { error: updateError } = await supabase
				.from("room_activities")
				.update(updateData)
				.eq("id", activityId);

			if (updateError) {
				return { success: false, error: updateError.message };
			}

			return { success: true };
		} catch (error) {
			console.error("Error joining activity:", error);
			return { success: false, error: "Failed to join activity" };
		}
	},

	// Get room settings
	async getRoomSettings(roomId: string): Promise<RoomSettings | null> {
		try {
			const { data, error } = await supabase
				.from("room_settings")
				.select("*")
				.eq("room_id", roomId)
				.single();

			if (error && error.code !== "PGRST116") {
				// PGRST116 = not found
				console.error("Error fetching room settings:", error);
				return null;
			}

			return data;
		} catch (error) {
			console.error("Error fetching room settings:", error);
			return null;
		}
	},

	// Create default room settings
	async createDefaultRoomSettings(
		roomId: string
	): Promise<RoomSettings | null> {
		try {
			const { data, error } = await supabase
				.from("room_settings")
				.insert({
					room_id: roomId,
					allow_messages: true,
					allow_activities: true,
					message_cooldown_minutes: 5,
					max_messages_per_hour: 10,
					gentle_mode: true,
					auto_ambient_sound: false,
					prompt_rotation_hours: 24,
				})
				.select()
				.single();

			if (error) {
				console.error("Error creating room settings:", error);
				return null;
			}

			return data;
		} catch (error) {
			console.error("Error creating room settings:", error);
			return null;
		}
	},

	// Get user's presence in room
	async getUserPresence(
		roomId: string,
		userId: string
	): Promise<RoomPresence | null> {
		try {
			const { data, error } = await supabase
				.from("room_presence")
				.select("*")
				.eq("room_id", roomId)
				.eq("user_id", userId)
				.is("left_at", null)
				.order("joined_at", { ascending: false })
				.limit(1);

			if (error || !data || data.length === 0) {
				return null;
			}

			return data[0];
		} catch (error) {
			console.error("Error fetching user presence:", error);
			return null;
		}
	},

	// Update user's last activity
	async updateUserActivity(roomId: string, userId: string): Promise<void> {
		try {
			await supabase
				.from("room_presence")
				.update({ last_activity: new Date().toISOString() })
				.eq("room_id", roomId)
				.eq("user_id", userId)
				.is("left_at", null);
		} catch (error) {
			console.error("Error updating user activity:", error);
		}
	},

	// Clean up old activities
	async cleanupOldActivities(): Promise<void> {
		try {
			await supabase.rpc("cleanup_old_room_activities");
		} catch (error) {
			console.error("Error cleaning up activities:", error);
		}
	},

	// Get room type icon
	getRoomIcon(roomType: string): string {
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
	},

	// Get activity type icon
	getActivityIcon(activityType: string): string {
		switch (activityType) {
			case "breathing":
				return "🫁";
			case "meditation":
				return "🧘";
			case "focus_timer":
				return "⏰";
			case "gentle_check_in":
				return "❤️";
			default:
				return "✨";
		}
	},

	// Format time duration
	formatDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	},

	// Get activity description
	getActivityDescription(activityType: RoomActivity["activity_type"]): string {
		switch (activityType) {
			case "breathing":
				return "A gentle breathing exercise to center yourself";
			case "meditation":
				return "A quiet moment of mindfulness and reflection";
			case "focus_timer":
				return "Focused work time using the Pomodoro technique";
			case "gentle_check_in":
				return "A soft space to share how you're feeling";
			default:
				return "A peaceful shared activity";
		}
	},

	// Subscribe to room changes
	subscribeToRoom(
		roomId: string,
		callbacks: {
			onRoomUpdate?: (room: ParallelRoom) => void;
			onMessageReceived?: (message: RoomMessage) => void;
			onActivityUpdate?: (activity: RoomActivity) => void;
		}
	): () => void {
		const subscription = supabase
			.channel(`room_${roomId}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "parallel_rooms",
					filter: `id=eq.${roomId}`,
				},
				(payload: any) => {
					if (callbacks.onRoomUpdate) {
						callbacks.onRoomUpdate(payload.new as ParallelRoom);
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
				(payload: any) => {
					if (callbacks.onMessageReceived) {
						callbacks.onMessageReceived(payload.new as RoomMessage);
					}
				}
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "room_activities",
					filter: `room_id=eq.${roomId}`,
				},
				(payload: any) => {
					if (callbacks.onActivityUpdate) {
						callbacks.onActivityUpdate(payload.new as RoomActivity);
					}
				}
			)
			.subscribe();

		return subscription.unsubscribe;
	},
};
