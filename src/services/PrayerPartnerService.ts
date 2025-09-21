// src/services/prayerPartnerService.ts
import { supabase } from './supabase';
import { PrayerPartnership, PrayerRequest, PrayerCheckIn, User, PrayerPreferences } from '../types';

export class PrayerPartnerService {
  // Get user's prayer partnerships
  static async getMyPartnerships(userId: string): Promise<PrayerPartnership[]> {
    try {
      // First get the partnerships
      const { data: partnerships, error } = await supabase
        .from('prayer_partnerships')
        .select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!partnerships || partnerships.length === 0) {
        return [];
      }

      // Get all unique user IDs from partnerships
      const userIds = new Set<string>();
      partnerships.forEach(p => {
        userIds.add(p.user1_id);
        userIds.add(p.user2_id);
        userIds.add(p.requested_by);
      });

      // Fetch user data separately
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, faith_mode')
        .in('id', Array.from(userIds));

      if (usersError) throw usersError;

      // Create a user lookup map
      const userMap = new Map();
      users?.forEach(user => {
        userMap.set(user.id, user);
      });

      // Add partner_user field for easier access
      const partnershipsWithPartner = partnerships.map(partnership => {
        const isUser1 = partnership.user1_id === userId;
        const partnerId = isUser1 ? partnership.user2_id : partnership.user1_id;
        const partner_user = userMap.get(partnerId);
        const requested_by_user = userMap.get(partnership.requested_by);
        
        return {
          ...partnership,
          partner_user,
          requested_by_user
        };
      });

      return partnershipsWithPartner;
    } catch (error) {
      console.error('Error fetching partnerships:', error);
      throw error;
    }
  }

  // Find potential prayer partners based on preferences and optionally location
  static async findPotentialPartners(
    userId: string,
    maxDistance?: number // Optional - in miles
  ): Promise<User[]> {
    try {
      // Get current user's info and preferences
      const { data: currentUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!currentUser) throw new Error('User not found');

      // Get existing partnerships to exclude
      const { data: existingPartnerships } = await supabase
        .from('prayer_partnerships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .in('status', ['pending', 'active']);

      const excludeUserIds = new Set([userId]);
      existingPartnerships?.forEach(p => {
        excludeUserIds.add(p.user1_id);
        excludeUserIds.add(p.user2_id);
      });

      let query = supabase
        .from('users')
        .select('*')
        .eq('faith_mode', true) // Only faith-enabled users
        .not('id', 'in', `(${Array.from(excludeUserIds).join(',')})`)
        .or('preferences->prayer->open_to_partnerships.is.null,preferences->prayer->open_to_partnerships.eq.true');

      // If location is provided and user wants distance filtering, apply it
      if (currentUser.location_lat && currentUser.location_lng && maxDistance) {
        // This is a simplified distance calculation - you might want to use PostGIS for better accuracy
        const { data, error } = await supabase.rpc('find_nearby_users_for_prayer', {
          user_lat: currentUser.location_lat,
          user_lng: currentUser.location_lng,
          max_distance_miles: maxDistance,
          exclude_user_ids: Array.from(excludeUserIds)
        });

        if (error) {
          console.warn('Location-based search failed, falling back to general search:', error);
          // Fall back to general query without location
        } else {
          return data || [];
        }
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error finding potential partners:', error);
      throw error;
    }
  }

  // Send prayer partner request
  static async sendPartnerRequest(
    fromUserId: string,
    toUserId: string,
    preferences: {
      prayer_time_preference?: string;
      check_in_frequency?: string;
      partnership_type?: string;
    }
  ): Promise<PrayerPartnership> {
    try {
      // Ensure user1_id < user2_id for consistent storage
      const user1_id = fromUserId < toUserId ? fromUserId : toUserId;
      const user2_id = fromUserId < toUserId ? toUserId : fromUserId;

      const { data, error } = await supabase
        .from('prayer_partnerships')
        .insert({
          user1_id,
          user2_id,
          requested_by: fromUserId,
          prayer_time_preference: preferences.prayer_time_preference || 'flexible',
          check_in_frequency: preferences.check_in_frequency || 'daily',
          partnership_type: preferences.partnership_type || 'general'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending partner request:', error);
      throw error;
    }
  }

  // Accept/reject prayer partner request
  static async respondToPartnerRequest(
    partnershipId: string,
    accept: boolean
  ): Promise<PrayerPartnership | null> {
    try {
      if (accept) {
        const { data, error } = await supabase
          .from('prayer_partnerships')
          .update({
            status: 'active',
            accepted_at: new Date().toISOString()
          })
          .eq('id', partnershipId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Delete the partnership if rejected
        const { error } = await supabase
          .from('prayer_partnerships')
          .delete()
          .eq('id', partnershipId);

        if (error) throw error;
        return null;
      }
    } catch (error) {
      console.error('Error responding to partner request:', error);
      throw error;
    }
  }

  // Send prayer request to partner
  static async sendPrayerRequest(
    partnershipId: string,
    fromUserId: string,
    toUserId: string,
    requestText: string,
    isUrgent: boolean = false
  ): Promise<PrayerRequest> {
    try {
      const { data, error } = await supabase
        .from('prayer_requests')
        .insert({
          partnership_id: partnershipId,
          from_user_id: fromUserId,
          to_user_id: toUserId,
          request_text: requestText,
          is_urgent: isUrgent
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending prayer request:', error);
      throw error;
    }
  }

  // Get prayer requests for user
  static async getPrayerRequests(userId: string): Promise<PrayerRequest[]> {
    try {
      // First get the prayer requests
      const { data: requests, error } = await supabase
        .from('prayer_requests')
        .select('*')
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!requests || requests.length === 0) {
        return [];
      }

      // Get all unique user IDs
      const userIds = new Set<string>();
      requests.forEach(r => {
        userIds.add(r.from_user_id);
        userIds.add(r.to_user_id);
      });

      // Fetch user data separately
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, display_name')
        .in('id', Array.from(userIds));

      if (usersError) throw usersError;

      // Create a user lookup map
      const userMap = new Map();
      users?.forEach(user => {
        userMap.set(user.id, user);
      });

      // Add user data to requests
      const requestsWithUsers = requests.map(request => ({
        ...request,
        from_user: userMap.get(request.from_user_id),
        to_user: userMap.get(request.to_user_id)
      }));

      return requestsWithUsers;
    } catch (error) {
      console.error('Error fetching prayer requests:', error);
      throw error;
    }
  }

  // Mark prayer request as answered
  static async markPrayerAnswered(
    requestId: string,
    answeredNote?: string
  ): Promise<PrayerRequest> {
    try {
      const { data, error } = await supabase
        .from('prayer_requests')
        .update({
          status: 'answered',
          answered_at: new Date().toISOString(),
          answered_note: answeredNote
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error marking prayer as answered:', error);
      throw error;
    }
  }

  // Send daily check-in
  static async sendCheckIn(
    partnershipId: string,
    fromUserId: string,
    toUserId: string,
    message: string,
    checkInType: string = 'daily'
  ): Promise<PrayerCheckIn> {
    try {
      const { data, error } = await supabase
        .from('prayer_check_ins')
        .insert({
          partnership_id: partnershipId,
          from_user_id: fromUserId,
          to_user_id: toUserId,
          message,
          check_in_type: checkInType
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending check-in:', error);
      throw error;
    }
  }

  // Get recent check-ins for partnership
  static async getRecentCheckIns(
    partnershipId: string,
    limit: number = 10
  ): Promise<PrayerCheckIn[]> {
    try {
      // First get the check-ins
      const { data: checkIns, error } = await supabase
        .from('prayer_check_ins')
        .select('*')
        .eq('partnership_id', partnershipId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (!checkIns || checkIns.length === 0) {
        return [];
      }

      // Get all unique user IDs
      const userIds = new Set<string>();
      checkIns.forEach(c => {
        userIds.add(c.from_user_id);
        userIds.add(c.to_user_id);
      });

      // Fetch user data separately
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, display_name')
        .in('id', Array.from(userIds));

      if (usersError) throw usersError;

      // Create a user lookup map
      const userMap = new Map();
      users?.forEach(user => {
        userMap.set(user.id, user);
      });

      // Add user data to check-ins
      const checkInsWithUsers = checkIns.map(checkIn => ({
        ...checkIn,
        from_user: userMap.get(checkIn.from_user_id),
        to_user: userMap.get(checkIn.to_user_id)
      }));

      return checkInsWithUsers;
    } catch (error) {
      console.error('Error fetching check-ins:', error);
      throw error;
    }
  }

  // Update user's prayer preferences
  static async updatePrayerPreferences(
    userId: string,
    preferences: PrayerPreferences
  ): Promise<void> {
    try {
      // Get current preferences
      const { data: user } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', userId)
        .single();

      const currentPreferences = user?.preferences || {};
      
      // Merge prayer preferences with existing preferences
      const updatedPreferences = {
        ...currentPreferences,
        prayer: preferences
      };

      const { error } = await supabase
        .from('users')
        .update({ preferences: updatedPreferences })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating prayer preferences:', error);
      throw error;
    }
  }

  // End a prayer partnership
  static async endPartnership(
    partnershipId: string,
    reason?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('prayer_partnerships')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', partnershipId);

      if (error) throw error;
    } catch (error) {
      console.error('Error ending partnership:', error);
      throw error;
    }
  }
}