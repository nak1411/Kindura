import React, { useState, useEffect, useRef } from "react";
import {
	View,
	StyleSheet,
	Alert,
	Dimensions,
	TouchableOpacity,
} from "react-native";
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
import MapView, { Region, Circle } from "react-native-maps";
import * as Location from "expo-location";
import { supabase } from "../../services/supabase";
import { useTheme } from "../../constants/theme-context";
import { User } from "../../types";

interface UserDensity {
	radius_km: number;
	user_count: number;
	label: string;
	color: string;
}

const { width, height } = Dimensions.get("window");

export default function MapScreen() {
	const { theme } = useTheme();
	const mapRef = useRef<MapView>(null);

	// State variables
	const [user, setUser] = useState<User | null>(null);
	const [currentLocation, setCurrentLocation] =
		useState<Location.LocationObject | null>(null);
	const [userDensity, setUserDensity] = useState<UserDensity[]>([]);
	const [permissionGranted, setPermissionGranted] = useState(false);
	const [loading, setLoading] = useState(true);
	const [showSettingsModal, setShowSettingsModal] = useState(false);
	const [showDebugPanel, setShowDebugPanel] = useState(false);
	const [tempLocationSharing, setTempLocationSharing] = useState(false);
	const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
	const [radiusInMiles, setRadiusInMiles] = useState(3); // Default 3 miles

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
			loadUserDensity();
		}
	}, [user, currentLocation, radiusInMiles]); // Re-load when radius changes

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

	const loadUserDensity = async () => {
		if (!currentLocation || !user?.location_sharing) return;

		try {
			// Convert miles to kilometers (1 mile = 1.60934 km)
			const radiusInKm = radiusInMiles * 1.60934;

			const { data, error } = await supabase
				.from("users")
				.select("id, location_lat, location_lng")
				.eq("location_sharing", true)
				.neq("id", user.id)
				.not("location_lat", "is", null)
				.not("location_lng", "is", null)
				.gte(
					"last_active",
					new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
				);

			if (error) throw error;

			// Count users within radius
			const usersInRadius =
				data?.filter((u) => {
					const distance = calculateDistance(
						currentLocation.coords.latitude,
						currentLocation.coords.longitude,
						u.location_lat,
						u.location_lng
					);
					return distance <= radiusInKm;
				}) || [];

			const densityData: UserDensity[] = [
				{
					radius_km: radiusInKm,
					user_count: usersInRadius.length,
					label: "Your Area",
					color: theme.colors.primary,
				},
			];

			// Add test data in development if no real users
			if (__DEV__ && densityData[0].user_count === 0) {
				// Scale test data based on radius (more users for larger radius)
				const testCount = Math.min(Math.floor(radiusInMiles / 5) + 2, 20);
				densityData[0].user_count = testCount;
			}

			setUserDensity(densityData);
		} catch (error) {
			console.error("Error loading user density:", error);
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

	// Add test density data (for development)
	const addTestDensity = () => {
		const testCount = Math.min(Math.floor(radiusInMiles / 5) + 2, 20);
		setUserDensity([
			{
				radius_km: radiusInMiles * 1.60934,
				user_count: testCount,
				label: "Your Area",
				color: theme.colors.primary,
			},
		]);
	};

	// Handle radius change
	const handleRadiusChange = (newRadius: number) => {
		setRadiusInMiles(newRadius);
		// Auto-refresh density when radius changes
		if (user?.location_sharing && currentLocation) {
			setTimeout(() => loadUserDensity(), 100);
		}
	};

	// Handle slider touch
	const handleSliderTouch = (event: any) => {
		const { locationX } = event.nativeEvent;
		const sliderWidth = 280; // Approximate slider width
		const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
		const newRadius = Math.round(1 + percentage * 99); // 1-100 range
		handleRadiusChange(newRadius);
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
				await loadUserDensity();
			} else if (!newValue) {
				// Clear location data when sharing is disabled
				await supabase
					.from("users")
					.update({ location_lat: null, location_lng: null })
					.eq("id", user.id);
				setUserDensity([]);
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

	// Get total user count
	const getTotalUsers = () => {
		return userDensity[0]?.user_count || 0;
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
			bottom: 160,
			backgroundColor: theme.colors.secondary,
		},
		debugFab: {
			position: "absolute",
			right: 16,
			bottom: 205,
			backgroundColor: theme.colors.error,
		},
		modalContent: {
			backgroundColor: theme.colors.surface,
			padding: 20,
			margin: 20,
			borderRadius: 8,
		},
		settingRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingVertical: 12,
		},
		totalUsersCard: {
			position: "absolute",
			top: 50,
			left: 20,
			backgroundColor: theme.colors.primaryContainer,
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderRadius: 16,
			zIndex: 1000,
		},
		radiusInfo: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 8,
		},
		sliderContainer: {
			marginTop: 8,
		},
		sliderLabels: {
			flexDirection: "row",
			justifyContent: "space-between",
			marginBottom: 12,
		},
		sliderTrack: {
			height: 12,
			borderRadius: 6,
			marginBottom: 16,
			position: "relative",
			marginHorizontal: 10,
		},
		sliderProgress: {
			height: 12,
			borderRadius: 6,
		},
		sliderThumb: {
			position: "absolute",
			top: -6,
			width: 24,
			height: 24,
			borderRadius: 12,
			marginLeft: -12,
			borderWidth: 2,
			borderColor: "white",
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.25,
			shadowRadius: 3.84,
			elevation: 5,
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
							To show you nearby Kindura users in your area, we need access to
							your location.
						</Text>
						<Text
							variant="bodySmall"
							style={{
								textAlign: "center",
								marginBottom: 20,
								color: theme.colors.outline,
							}}
						>
							We only show user counts, never exact locations.
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
				{/* Show single area circle around user */}
				{userDensity.length > 0 && (
					<Circle
						center={{
							latitude: currentLocation?.coords.latitude || 0,
							longitude: currentLocation?.coords.longitude || 0,
						}}
						radius={radiusInMiles * 1609.34} // Convert miles directly to meters (1 mile = 1609.34 meters)
						fillColor={`${userDensity[0].color}${
							userDensity[0].user_count > 0 ? "20" : "10"
						}`}
						strokeColor={userDensity[0].color}
						strokeWidth={userDensity[0].user_count > 0 ? 2 : 1}
					/>
				)}
			</MapView>

			{/* Total Users Indicator */}
			{getTotalUsers() > 0 && (
				<Surface style={styles.totalUsersCard}>
					<Text
						variant="labelMedium"
						style={{
							color: theme.colors.onPrimaryContainer,
							fontWeight: "bold",
						}}
					>
						{getTotalUsers()} users within {radiusInMiles} mile
						{radiusInMiles !== 1 ? "s" : ""}
					</Text>
				</Surface>
			)}

			{/* Debug FAB (development only) */}
			{__DEV__ && (
				<FAB
					icon="bug"
					style={styles.debugFab}
					onPress={() => setShowDebugPanel(true)}
					size="small"
				/>
			)}

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
						Community Map Settings
					</Text>

					<View style={styles.settingRow}>
						<View style={{ flex: 1 }}>
							<Text variant="bodyLarge">Join Community Map</Text>
							<Text variant="bodySmall" style={{ color: theme.colors.outline }}>
								Be counted in nearby user statistics
							</Text>
						</View>
						<Switch
							value={tempLocationSharing}
							onValueChange={toggleLocationSharing}
							color={theme.colors.primary}
						/>
					</View>

					<Divider style={{ marginVertical: 16 }} />

					{/* Radius Setting */}
					<View style={{ marginBottom: 16 }}>
						<View style={styles.radiusInfo}>
							<Text variant="bodyLarge">Search Radius</Text>
							<Text
								variant="bodyMedium"
								style={{ color: theme.colors.primary, fontWeight: "bold" }}
							>
								{radiusInMiles} mile{radiusInMiles !== 1 ? "s" : ""}
							</Text>
						</View>
						<Text
							variant="bodySmall"
							style={{ color: theme.colors.outline, marginBottom: 16 }}
						>
							Tap on the slider to adjust radius
						</Text>

						{/* Interactive Slider */}
						<View style={styles.sliderContainer}>
							<View style={styles.sliderLabels}>
								<Text
									variant="bodySmall"
									style={{ color: theme.colors.outline }}
								>
									1 mi
								</Text>
								<Text
									variant="bodySmall"
									style={{ color: theme.colors.outline }}
								>
									100 mi
								</Text>
							</View>

							{/* Touchable slider track */}
							<TouchableOpacity
								style={[
									styles.sliderTrack,
									{ backgroundColor: theme.colors.outline + "40" },
								]}
								onPress={handleSliderTouch}
								activeOpacity={0.8}
							>
								<View
									style={[
										styles.sliderProgress,
										{
											backgroundColor: theme.colors.primary,
											width: `${((radiusInMiles - 1) / 99) * 100}%`,
										},
									]}
								/>
								<View
									style={[
										styles.sliderThumb,
										{
											backgroundColor: theme.colors.primary,
											left: `${((radiusInMiles - 1) / 99) * 100}%`,
										},
									]}
								/>
							</TouchableOpacity>
						</View>
					</View>

					<Button
						mode="outlined"
						onPress={() => setShowSettingsModal(false)}
						style={{ marginTop: 20, borderRadius: 8 }}
					>
						Close
					</Button>
				</Modal>
			</Portal>

			{/* Debug Panel (development only) */}
			{__DEV__ && (
				<Portal>
					<Modal
						visible={showDebugPanel}
						onDismiss={() => setShowDebugPanel(false)}
						contentContainerStyle={styles.modalContent}
					>
						<Text variant="titleMedium" style={{ marginBottom: 20 }}>
							🐛 Debug Panel
						</Text>

						<Text variant="bodyMedium" style={{ marginBottom: 10 }}>
							Current Location: {currentLocation ? "✅" : "❌"}
						</Text>
						<Text variant="bodyMedium" style={{ marginBottom: 10 }}>
							Location Sharing: {user?.location_sharing ? "✅" : "❌"}
						</Text>
						<Text variant="bodyMedium" style={{ marginBottom: 10 }}>
							Search Radius: {radiusInMiles} miles
						</Text>
						<Text variant="bodyMedium" style={{ marginBottom: 10 }}>
							Area Users: {getTotalUsers()}
						</Text>

						{currentLocation && (
							<Text
								variant="bodySmall"
								style={{ marginBottom: 20, color: theme.colors.outline }}
							>
								Lat: {currentLocation.coords.latitude.toFixed(4)}
								{"\n"}
								Lng: {currentLocation.coords.longitude.toFixed(4)}
							</Text>
						)}

						<Button
							mode="contained"
							onPress={addTestDensity}
							style={{ marginBottom: 10, borderRadius: 8 }}
						>
							Add Test Users
						</Button>

						<Button
							mode="outlined"
							onPress={() => handleRadiusChange(radiusInMiles === 3 ? 10 : 3)}
							style={{ marginBottom: 10, borderRadius: 8 }}
						>
							Toggle Radius ({radiusInMiles === 3 ? "10" : "3"} miles)
						</Button>

						<Button
							mode="outlined"
							onPress={() => setUserDensity([])}
							style={{ marginBottom: 10, borderRadius: 8 }}
						>
							Clear Users
						</Button>

						<Button
							mode="outlined"
							onPress={() => setShowDebugPanel(false)}
							style={{ borderRadius: 8 }}
						>
							Close
						</Button>
					</Modal>
				</Portal>
			)}

			{/* Location sharing disabled warning */}
			{!user?.location_sharing && (
				<Card style={styles.permissionCard}>
					<Card.Content>
						<Text
							variant="titleSmall"
							style={{ textAlign: "center", marginBottom: 8 }}
						>
							Not Part of Community Map
						</Text>
						<Text
							variant="bodySmall"
							style={{ textAlign: "center", marginBottom: 12 }}
						>
							Join to see nearby user counts and be counted yourself
						</Text>
						<Button
							mode="outlined"
							onPress={() => setShowSettingsModal(true)}
							style={{ borderRadius: 8 }}
							compact
						>
							Join Community
						</Button>
					</Card.Content>
				</Card>
			)}
		</View>
	);
}
