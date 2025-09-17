import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Alert, Dimensions } from "react-native";
import {
	Text,
	Card,
	Button,
	FAB,
	Portal,
	Modal,
	Surface,
	Switch,
	Divider,
	IconButton,
} from "react-native-paper";
import MapView, { Marker, Region, Circle } from "react-native-maps";
import * as Location from "expo-location";
import { supabase } from "../../services/supabase";
import { useTheme } from "../../constants/theme-context";
import { User } from "../../types";

interface NearbyUser {
	id: string;
	display_name: string;
	approximate_distance: number;
	general_area: {
		lat: number;
		lng: number;
	};
}

const { width, height } = Dimensions.get("window");

export default function MapScreen() {
	const { theme } = useTheme();
	const mapRef = useRef<MapView>(null);

	// State variables
	const [user, setUser] = useState<User | null>(null);
	const [currentLocation, setCurrentLocation] =
		useState<Location.LocationObject | null>(null);
	const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
	const [permissionGranted, setPermissionGranted] = useState(false);
	const [loading, setLoading] = useState(true);
	const [showSettingsModal, setShowSettingsModal] = useState(false);
	const [tempLocationSharing, setTempLocationSharing] = useState(false);
	const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

	const [mapRegion, setMapRegion] = useState<Region>({
		latitude: 37.78825,
		longitude: -122.4324,
		latitudeDelta: 0.0922,
		longitudeDelta: 0.0421,
	});

	// Effects
	useEffect(() => {
		initializeMap();
	}, []);

	useEffect(() => {
		if (user?.location_sharing && currentLocation) {
			updateUserLocation();
			loadNearbyUsers();
		}
	}, [user, currentLocation]);

	// Main functions
	const initializeMap = async () => {
		await loadUser();
		await checkLocationPermission();
		setLoading(false);
	};

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
				setTempLocationSharing(data?.location_sharing || false);
			}
		} catch (error) {
			console.error("Error loading user:", error);
		}
	};

	const checkLocationPermission = async () => {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			setPermissionGranted(status === "granted");

			if (status === "granted") {
				await getCurrentLocation();
			}
		} catch (error) {
			console.error("Error checking location permission:", error);
		}
	};

	const getCurrentLocation = async () => {
		try {
			const location = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced,
			});
			setCurrentLocation(location);

			// Update map region to user's location
			setMapRegion({
				latitude: location.coords.latitude,
				longitude: location.coords.longitude,
				latitudeDelta: 0.0922,
				longitudeDelta: 0.0421,
			});
		} catch (error) {
			console.error("Error getting location:", error);
		}
	};

	const updateUserLocation = async () => {
		if (!currentLocation || !user || isUpdatingLocation) return;

		try {
			setIsUpdatingLocation(true);
			// Round coordinates to ~1km accuracy for privacy
			const privacyLat =
				Math.round(currentLocation.coords.latitude * 100) / 100;
			const privacyLng =
				Math.round(currentLocation.coords.longitude * 100) / 100;

			await supabase
				.from("users")
				.update({
					location_lat: privacyLat,
					location_lng: privacyLng,
					last_active: new Date().toISOString(),
				})
				.eq("id", user.id);
		} catch (error) {
			console.error("Error updating location:", error);
		} finally {
			setIsUpdatingLocation(false);
		}
	};

	const loadNearbyUsers = async () => {
		if (!currentLocation || !user?.location_sharing) return;

		try {
			const { data, error } = await supabase
				.from("users")
				.select("id, display_name, location_lat, location_lng")
				.eq("location_sharing", true)
				.neq("id", user.id)
				.not("location_lat", "is", null)
				.not("location_lng", "is", null)
				.gte(
					"last_active",
					new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
				);

			if (error) throw error;

			// Transform data to nearby users format
			const nearby =
				data
					?.map((u) => ({
						id: u.id,
						display_name: u.display_name,
						approximate_distance: Math.round(
							calculateDistance(
								currentLocation.coords.latitude,
								currentLocation.coords.longitude,
								u.location_lat,
								u.location_lng
							)
						),
						general_area: {
							lat: u.location_lat,
							lng: u.location_lng,
						},
					}))
					.filter((u) => u.approximate_distance <= 10) || []; // 10km limit

			setNearbyUsers(nearby);
		} catch (error) {
			console.error("Error loading nearby users:", error);
		}
	};

	// Helper functions
	const calculateDistance = (
		lat1: number,
		lng1: number,
		lat2: number,
		lng2: number
	): number => {
		const R = 6371; // Earth's radius in km
		const dLat = toRadians(lat2 - lat1);
		const dLng = toRadians(lng2 - lng1);
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(toRadians(lat1)) *
				Math.cos(toRadians(lat2)) *
				Math.sin(dLng / 2) *
				Math.sin(dLng / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	};

	const toRadians = (degrees: number): number => {
		return degrees * (Math.PI / 180);
	};

	const toggleLocationSharing = async () => {
		if (!user) return;

		try {
			const newValue = !tempLocationSharing;
			setTempLocationSharing(newValue);

			await supabase
				.from("users")
				.update({ location_sharing: newValue })
				.eq("id", user.id);

			setUser({ ...user, location_sharing: newValue });

			if (newValue && permissionGranted && currentLocation) {
				await updateUserLocation();
				await loadNearbyUsers();
			} else if (!newValue) {
				// Clear location data when sharing is disabled
				await supabase
					.from("users")
					.update({ location_lat: null, location_lng: null })
					.eq("id", user.id);
				setNearbyUsers([]);
			}
		} catch (error) {
			console.error("Error toggling location sharing:", error);
			setTempLocationSharing(!tempLocationSharing);
			Alert.alert("Error", "Failed to update location sharing settings");
		}
	};

	const centerOnUserLocation = () => {
		if (currentLocation && mapRef.current) {
			mapRef.current.animateToRegion({
				latitude: currentLocation.coords.latitude,
				longitude: currentLocation.coords.longitude,
				latitudeDelta: 0.0922,
				longitudeDelta: 0.0421,
			});
		}
	};

	// Styles
	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.colors.background,
		},
		map: {
			width: width,
			height: height - 100, // Account for tab navigation
		},
		permissionCard: {
			position: "absolute",
			top: 50,
			left: 20,
			right: 20,
			backgroundColor: theme.colors.surface,
			borderRadius: 12,
			zIndex: 1000,
		},
		loadingCard: {
			position: "absolute",
			top: "50%",
			left: 20,
			right: 20,
			backgroundColor: theme.colors.surface,
			borderRadius: 12,
			zIndex: 1000,
		},
		fab: {
			position: "absolute",
			right: 16,
			bottom: 100,
			backgroundColor: theme.colors.primary,
		},
		settingsFab: {
			position: "absolute",
			right: 16,
			bottom: 170,
			backgroundColor: theme.colors.secondary,
		},
		privacyFab: {
			position: "absolute",
			left: 16,
			bottom: 170,
			backgroundColor: theme.colors.tertiary,
		},
		modalContent: {
			backgroundColor: theme.colors.surface,
			padding: 20,
			margin: 20,
			borderRadius: 12,
		},
		settingRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 12,
		},
		userCount: {
			position: "absolute",
			top: 50,
			right: 20,
			backgroundColor: theme.colors.primaryContainer,
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 16,
			zIndex: 1000,
		},
	});

	// Render conditions
	if (loading) {
		return (
			<View style={styles.container}>
				<Card style={styles.loadingCard}>
					<Card.Content>
						<Text
							variant="titleMedium"
							style={{ textAlign: "center", marginBottom: 16 }}
						>
							🗺️ Loading Map
						</Text>
						<Text variant="bodyMedium" style={{ textAlign: "center" }}>
							Setting up your connection map...
						</Text>
					</Card.Content>
				</Card>
			</View>
		);
	}

	if (!permissionGranted) {
		return (
			<View style={styles.container}>
				<Card style={styles.permissionCard}>
					<Card.Content>
						<Text
							variant="titleMedium"
							style={{ textAlign: "center", marginBottom: 16 }}
						>
							🗺️ Location Access Needed
						</Text>
						<Text
							variant="bodyMedium"
							style={{ textAlign: "center", marginBottom: 16 }}
						>
							To show you nearby Kindura users and find peaceful places, we need
							access to your location.
						</Text>
						<Text
							variant="bodySmall"
							style={{
								textAlign: "center",
								marginBottom: 20,
								color: theme.colors.outline,
							}}
						>
							Your exact location is never shared - only general areas for
							privacy.
						</Text>
						<Button
							mode="contained"
							onPress={checkLocationPermission}
							style={{ borderRadius: 8 }}
						>
							Grant Location Access
						</Button>
					</Card.Content>
				</Card>
			</View>
		);
	}

	// Main render
	return (
		<View style={styles.container}>
			<MapView
				ref={mapRef}
				style={styles.map}
				region={mapRegion}
				onRegionChangeComplete={setMapRegion}
				showsUserLocation={true}
				showsMyLocationButton={false}
				showsCompass={true}
				mapType="standard"
			>
				{/* Show general areas where users are located */}
				{nearbyUsers.map((nearbyUser) => (
					<React.Fragment key={nearbyUser.id}>
						{/* Privacy circle showing general area */}
						<Circle
							center={{
								latitude: nearbyUser.general_area.lat,
								longitude: nearbyUser.general_area.lng,
							}}
							radius={1000} // 1km radius
							fillColor={`${theme.colors.primary}20`}
							strokeColor={theme.colors.primary}
							strokeWidth={2}
						/>
						{/* Anonymous marker in center of area */}
						<Marker
							coordinate={{
								latitude: nearbyUser.general_area.lat,
								longitude: nearbyUser.general_area.lng,
							}}
							title="Kindura User"
							description={`~${nearbyUser.approximate_distance}km away`}
						/>
					</React.Fragment>
				))}
			</MapView>

			{/* User count indicator */}
			{nearbyUsers.length > 0 && (
				<Surface style={styles.userCount}>
					<Text
						variant="labelMedium"
						style={{ color: theme.colors.onPrimaryContainer }}
					>
						{nearbyUsers.length} nearby user
						{nearbyUsers.length !== 1 ? "s" : ""}
					</Text>
				</Surface>
			)}

			{/* Privacy Info FAB */}
			<FAB
				icon="shield-check"
				style={styles.privacyFab}
				onPress={() => {
					Alert.alert(
						"Privacy Protection",
						"🔒 Your location is protected:\n\n• Exact location never shared\n• Only general areas shown\n• Anonymous to other users\n• Turn off anytime"
					);
				}}
				size="small"
			/>

			{/* Center on location FAB */}
			<FAB
				icon="crosshairs-gps"
				style={styles.fab}
				onPress={centerOnUserLocation}
				disabled={!currentLocation}
				loading={isUpdatingLocation}
			/>

			{/* Settings FAB */}
			<FAB
				icon="cog"
				style={styles.settingsFab}
				onPress={() => setShowSettingsModal(true)}
				size="small"
			/>

			{/* Settings Modal */}
			<Portal>
				<Modal
					visible={showSettingsModal}
					onDismiss={() => setShowSettingsModal(false)}
					contentContainerStyle={styles.modalContent}
				>
					<Text variant="titleMedium" style={{ marginBottom: 20 }}>
						Map Settings
					</Text>

					<View style={styles.settingRow}>
						<View style={{ flex: 1 }}>
							<Text variant="bodyLarge">Location Sharing</Text>
							<Text variant="bodySmall" style={{ color: theme.colors.outline }}>
								Help others find you in general areas
							</Text>
						</View>
						<Switch
							value={tempLocationSharing}
							onValueChange={toggleLocationSharing}
							color={theme.colors.primary}
						/>
					</View>

					<Divider style={{ marginVertical: 16 }} />

					<View style={styles.settingRow}>
						<View style={{ flex: 1 }}>
							<Text variant="bodyMedium">Learn About Privacy</Text>
							<Text variant="bodySmall" style={{ color: theme.colors.outline }}>
								How we protect your location data
							</Text>
						</View>
						<IconButton
							icon="information-outline"
							onPress={() => {
								setShowSettingsModal(false);
								Alert.alert(
									"Privacy Protection",
									"Your location is protected with 1km privacy radius. Your exact location is never shared - only general areas are shown to other users."
								);
							}}
						/>
					</View>

					<Text
						variant="bodySmall"
						style={{ color: theme.colors.outline, lineHeight: 20 }}
					>
						🔒 Privacy Protection:{"\n"}• Your exact location is never shared
						{"\n"}• Only general areas (~1km radius) are shown{"\n"}• You appear
						as anonymous to others{"\n"}• Turn off anytime in settings{"\n"}•
						Location updates when you open the map
					</Text>

					<Button
						mode="outlined"
						onPress={() => setShowSettingsModal(false)}
						style={{ marginTop: 20, borderRadius: 8 }}
					>
						Close
					</Button>
				</Modal>
			</Portal>

			{/* Location sharing disabled warning */}
			{!user?.location_sharing && (
				<Card style={styles.permissionCard}>
					<Card.Content>
						<Text
							variant="titleSmall"
							style={{ textAlign: "center", marginBottom: 8 }}
						>
							Location Sharing Disabled
						</Text>
						<Text
							variant="bodySmall"
							style={{ textAlign: "center", marginBottom: 12 }}
						>
							Enable location sharing to see nearby users
						</Text>
						<Button
							mode="outlined"
							onPress={() => setShowSettingsModal(true)}
							style={{ borderRadius: 8 }}
							compact
						>
							Enable
						</Button>
					</Card.Content>
				</Card>
			)}
		</View>
	);
}
