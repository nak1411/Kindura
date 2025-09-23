// src/types/index.ts
export interface User {
  id: string;
  email: string;
  phone?: string;
  display_name: string;
  faith_mode: boolean;
  care_score: number;
  preferences: {
    voice_comfort?: boolean;
    video_comfort?: boolean;
    topics_to_avoid?: string[];
    faith_preferences?: string;
    prayer?: PrayerPreferences;
  };
  bio?: string;
  location_lat?: number;
  location_lng?: number;
  location_sharing?: boolean;
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
  ambient_sound?: string;
  prompt_of_moment?: string;
  faith_content: boolean;
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

export interface Nudge {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  nudge_type: 'encouragement' | 'check_in' | 'prayer_reminder';
  is_read: boolean;
  created_at: string;
  from_user?: User;
  to_user?: User;
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