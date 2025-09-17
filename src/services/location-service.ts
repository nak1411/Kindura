// src/services/location-service.ts - Simple version for initial implementation
import * as Location from "expo-location";
import { supabase } from "./supabase";

export class LocationService {
	/**
	 * Request location permissions
	 */
	async requestPermissions(): Promise<boolean> {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			return status === "granted";
		} catch (error) {
			console.error("Error requesting location permissions:", error);
			return false;
		}
	}

	/**
	 * Get current location
	 */
	async getCurrentLocation(): Promise<Location.LocationObject | null> {
		try {
			const hasPermission = await this.requestPermissions();
			if (!hasPermission) {
				throw new Error("Location permission not granted");
			}

			const location = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced,
			});

			return location;
		} catch (error) {
			console.error("Error getting current location:", error);
			return null;
		}
	}

	/**
	 * Privacy-first coordinate rounding
	 */
	private roundCoordinatesForPrivacy(lat: number, lng: number): { lat: number; lng: number } {
		// Round to ~1km accuracy (2 decimal places = ~1.1km at equator)
		return {
			lat: Math.round(lat * 100) / 100,
			lng: Math.round(lng * 100) / 100,
		};
	}

	/**
	 * Update user location with privacy protection
	 */
	async updateUserLocation(userId: string, location: Location.LocationObject): Promise<boolean> {
		try {
			// Round coordinates for privacy
			const privacyCoords = this.roundCoordinatesForPrivacy(
				location.coords.latitude,
				location.coords.longitude
			);

			const { error } = await supabase
				.from("users")
				.update({
					location_lat: privacyCoords.lat,
					location_lng: privacyCoords.lng,
					last_active: new Date().toISOString(),
				})
				.eq("id", userId);

			if (error) throw error;
			return true;
		} catch (error) {
			console.error("Error updating user location:", error);
			return false;
		}
	}

	/**
	 * Get nearby users (simple version)
	 */
	async getNearbyUsers(currentLocation: Location.LocationObject, userId: string): Promise<any[]> {
		try {
			// Simple query for now - later replace with RPC function
			const { data, error } = await supabase
				.from("users")
				.select("id, display_name, location_lat, location_lng")
				.eq("location_sharing", true)
				.neq("id", userId)
				.not("location_lat", "is", null)
				.not("location_lng", "is", null);

			if (error) throw error;

			// Filter by distance and transform data
			const nearby = data?.map(u => ({
				id: u.id,
				display_name: u.display_name,
				approximate_distance: Math.round(
					this.calculateDistance(
						currentLocation.coords.latitude,
						currentLocation.coords.longitude,
						u.location_lat,
						u.location_lng
					)
				),
				general_area: {
					lat: u.location_lat,
					lng: u.location_lng
				}
			})).filter(u => u.approximate_distance <= 10) || []; // 10km limit

			return nearby;
		} catch (error) {
			console.error("Error getting nearby users:", error);
			return [];
		}
	}

	/**
	 * Calculate distance between two points
	 */
	calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
		const R = 6371; // Earth's radius in km
		const dLat = this.toRadians(lat2 - lat1);
		const dLng = this.toRadians(lng2 - lng1);
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(this.toRadians(lat1)) *
				Math.cos(this.toRadians(lat2)) *
				Math.sin(dLng / 2) *
				Math.sin(dLng / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}

	private toRadians(degrees: number): number {
		return degrees * (Math.PI / 180);
	}

	/**
	 * Toggle location sharing
	 */
	async toggleLocationSharing(userId: string, enabled: boolean): Promise<boolean> {
		try {
			const updateData: any = { location_sharing: enabled };
			
			// Clear location data when disabled
			if (!enabled) {
				updateData.location_lat = null;
				updateData.location_lng = null;
			}

			const { error } = await supabase
				.from("users")
				.update(updateData)
				.eq("id", userId);

			if (error) throw error;
			return true;
		} catch (error) {
			console.error("Error toggling location sharing:", error);
			return false;
		}
	}

	/**
	 * Get privacy status message
	 */
	getPrivacyStatus(): string {
		return "🔒 Your location is protected with 1km privacy radius";
	}
}

// Export a singleton instance
export const locationService = new LocationService();