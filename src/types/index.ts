// src/types/index.ts - Updated with nudge system types
export interface User {
  id: string;
  email: string;
  phone?: string;
  display_name: string;
  care_score: number;
  nudges_sent?: number;
  rooms_participated?: number;
  current_streak?: number;
  bio?: string;
  location_lat?: number;
  location_lng?: number;
  location_sharing?: boolean;
  notifications_enabled?: boolean;
  last_active: string;
  created_at: string;
  updated_at: string;
}

export interface ParallelRoom {
  id: string;
  name: string;
  room_type: 'focus' | 'walk' | 'read' | 'create' | 'pray';
  description?: string;
  current_participants: string[];
  max_capacity: number;
  prompt_of_moment?: string;
  is_active: boolean;
  created_at: string;
}

// Prayer Partner Types
export interface PrayerPartnership {
  id: string;
  user1_id: string;
  user2_id: string;
  status: 'pending' | 'active' | 'paused' | 'ended';
  requested_by: string;
  created_at: string;
  accepted_at?: string;
  ended_at?: string;
  
  // Partnership preferences
  prayer_time_preference?: string; // 'morning', 'afternoon', 'evening', 'flexible'
  check_in_frequency: string; // 'daily', 'weekly', 'flexible'
  partnership_type: string; // 'general', 'accountability', 'specific_need'
  
  // Populated user data (from joins)
  partner_user?: User;
  requested_by_user?: User;
}

export interface PrayerRequest {
  id: string;
  partnership_id: string;
  from_user_id: string;
  to_user_id: string;
  request_text: string;
  is_urgent: boolean;
  status: 'active' | 'answered' | 'ongoing';
  answered_at?: string;
  answered_note?: string;
  created_at: string;
  
  // Populated user data
  from_user?: User;
  to_user?: User;
}

export interface PrayerCheckIn {
  id: string;
  partnership_id: string;
  from_user_id: string;
  to_user_id: string;
  message?: string;
  check_in_type: string; // 'daily', 'weekly', 'prayer_time'
  responded_at?: string;
  response_message?: string;
  created_at: string;
  
  // Populated user data
  from_user?: User;
  to_user?: User;
}

export interface PrayerPreferences {
  preferred_time?: 'morning' | 'afternoon' | 'evening' | 'flexible';
  frequency?: 'daily' | 'weekly' | 'flexible';
  partnership_types?: ('general' | 'accountability' | 'specific_need')[];
  topics?: string[];
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  is_active: boolean;
  user?: User;
}

// Updated and enhanced Nudge interface
export interface Nudge {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  nudge_type: 'encouragement' | 'check_in' | 'prayer_reminder' | 'gentle_nudge';
  is_read: boolean;
  created_at: string;
  updated_at?: string;
  from_user?: User;
  to_user?: User;
}

// New interface for user room participation tracking
export interface UserRoomHistory {
  id: string;
  user_id: string;
  room_id: string;
  first_joined_at: string;
  created_at: string;
}

// Enhanced User Interactions interface for care score tracking
export interface UserInteraction {
  id: string;
  user_id: string;
  interaction_type: 'room_participated' | 'nudge_sent' | 'nudge_received' | 'prayer_partner_matched' | 'message_sent';
  points: number;
  metadata?: {
    room_id?: string;
    nudge_id?: string;
    partnership_id?: string;
    message_id?: string;
  };
  created_at: string;
}

// Dashboard-specific types
export interface DashboardStats {
  roomsJoined: number;
  nudgesSent: number;
  prayerPartners: number;
  careScore: number;
  currentStreak: number;
}

export interface RecentActivity {
  id: string;
  type: 'room' | 'nudge' | 'prayer' | 'partnership';
  title: string;
  description?: string;
  time: string;
  participants?: number;
  icon?: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Rooms: undefined;
  Prayer: undefined;
  Map: undefined;
  Profile: undefined;
  Debug?: undefined;
};

export type RoomsStackParamList = {
  RoomList: undefined;
  RoomDetail: { roomId: string };
};

export type PrayerStackParamList = {
  PrayerPartnersList: undefined;
  PrayerRequests: undefined;
  PartnerProfile: { partnerId: string };
};

// Additional utility types for the nudge system
export type NudgeType = 'encouragement' | 'check_in' | 'prayer_reminder' | 'gentle_nudge';

export interface CreateNudgeParams {
  to_user_id: string;
  message: string;
  nudge_type: NudgeType;
}

export interface NudgeNotification {
  id: string;
  nudge_id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Room message types for the chat system
export interface RoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  message_type: 'text' | 'gentle_nudge' | 'reflection' | 'presence_update' | 'system_message';
  created_at: string;
  updated_at?: string;
  user?: Pick<User, 'id' | 'display_name'>;
  metadata?: {
    nudge_id?: string;
    activity_id?: string;
  };
}