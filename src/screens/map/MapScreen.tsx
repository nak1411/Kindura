import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert, Dimensions } from "react-native";
import {
	Text,
	Card,
	Button,
	Chip,
	FAB,
	Portal,
	Modal,
	Surface,
	TextInput,
} from "react-native-paper";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { supabase } from "../../services/supabase";
import { theme } from "../../constants/theme";

interface ThirdPlace {
	id: string;
	name: string;
	address: string;
	location_lat: number;
	location_lng: number;
	place_type: string;
	description?: string;
	amenities: string[];
	verified: boolean;
}

interface MicroGathering {
	id: string;
	third_place_id: string;
	title: string;
	description?: string;
	scheduled_for: string;
	duration_minutes: number;
	max_participants: number;
	current_participants: string[];
	activity_type: string;
	faith_content: boolean;
	third_place?: ThirdPlace;
}

const { width, height } = Dimensions.get("window");

export default function MapScreen() {
	const [region, setRegion] = useState<Region>({
		latitude: 47.6587, // Spokane coordinates
		longitude: -117.426,
		latitudeDelta: 0.0922,
		longitudeDelta: 0.0421,
	});
	const [thirdPlaces, setThirdPlaces] = useState<ThirdPlace[]>([]);
	const [microGatherings, setMicroGatherings] = useState<MicroGathering[]>([]);
	const [selectedPlace, setSelectedPlace] = useState<ThirdPlace | null>(null);
	const [modalVisible, setModalVisible] = useState(false);
	const [createGatheringMode, setCreateGatheringMode] = useState(false);
	const [newGathering, setNewGathering] = useState({
		title: "",
		description: "",
		activity_type: "",
		duration_minutes: 60,
		max_participants: 4,
	});

	useEffect(() => {
		requestLocationPermission();
		loadThirdPlaces();
		loadMicroGatherings();
	}, []);

	const requestLocationPermission = async () => {
		const { status } = await Location.requestForegroundPermissionsAsync();
		if (status === "granted") {
			const location = await Location.getCurrentPositionAsync({});
			setRegion({
				latitude: location.coords.latitude,
				longitude: location.coords.longitude,
				latitudeDelta: 0.0922,
				longitudeDelta: 0.0421,
			});
		}
	};

	const loadThirdPlaces = async () => {
		try {
			const { data, error } = await supabase
				.from("third_places")
				.select("*")
				.order("created_at", { ascending: false });

			if (error) throw error;
			setThirdPlaces(data || []);
		} catch (error) {
			console.error("Error loading third places:", error);
		}
	};

	const loadMicroGatherings = async () => {
		try {
			const { data, error } = await supabase
				.from("micro_gatherings")
				.select(
					`
          *,
          third_place:third_places(*)
        `
				)
				.eq("status", "active")
				.gte("scheduled_for", new Date().toISOString())
				.order("scheduled_for", { ascending: true });

			if (error) throw error;
			setMicroGatherings(data || []);
		} catch (error) {
			console.error("Error loading micro gatherings:", error);
		}
	};

	const getPlaceIcon = (placeType: string) => {
		switch (placeType) {
			case "library":
				return "📚";
			case "cafe":
				return "☕";
			case "park":
				return "🌳";
			case "church":
				return "⛪";
			case "community_center":
				return "🏛️";
			default:
				return "📍";
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return (
			date.toLocaleDateString() +
			" at " +
			date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
		);
	};

	const createMicroGathering = async () => {
		if (!selectedPlace || !newGathering.title || !newGathering.activity_type) {
			Alert.alert("Missing Information", "Please fill in all required fields");
			return;
		}

		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error("Not authenticated");

			const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

			const { error } = await supabase.from("micro_gatherings").insert({
				third_place_id: selectedPlace.id,
				host_id: user.id,
				title: newGathering.title,
				description: newGathering.description,
				scheduled_for: scheduledFor.toISOString(),
				duration_minutes: newGathering.duration_minutes,
				max_participants: newGathering.max_participants,
				current_participants: [user.id],
				activity_type: newGathering.activity_type,
				faith_content: false,
			});

			if (error) throw error;

			Alert.alert("Success!", "Your micro-gathering has been created");
			setCreateGatheringMode(false);
			setNewGathering({
				title: "",
				description: "",
				activity_type: "",
				duration_minutes: 60,
				max_participants: 4,
			});
			loadMicroGatherings();
		} catch (error) {
			console.error("Error creating gathering:", error);
			Alert.alert("Error", "Failed to create micro-gathering");
		}
	};

	const joinGathering = async (gathering: MicroGathering) => {
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error("Not authenticated");

			if (gathering.current_participants.includes(user.id)) {
				Alert.alert("Already Joined", "You're already part of this gathering");
				return;
			}

			if (gathering.current_participants.length >= gathering.max_participants) {
				Alert.alert("Full", "This gathering is at capacity");
				return;
			}

			const updatedParticipants = [...gathering.current_participants, user.id];

			const { error } = await supabase
				.from("micro_gatherings")
				.update({
					current_participants: updatedParticipants,
				})
				.eq("id", gathering.id);

			if (error) throw error;

			Alert.alert(
				"Joined!",
				`You've joined "${gathering.title}". See you there!`
			);
			loadMicroGatherings();
		} catch (error) {
			console.error("Error joining gathering:", error);
			Alert.alert("Error", "Failed to join gathering");
		}
	};

	return (
		<View style={styles.container}>
			<MapView
				style={styles.map}
				region={region}
				onRegionChangeComplete={setRegion}
				showsUserLocation={true}
				showsMyLocationButton={true}
			>
				{thirdPlaces.map((place) => (
					<Marker
						key={place.id}
						coordinate={{
							latitude: place.location_lat,
							longitude: place.location_lng,
						}}
						title={place.name}
						description={place.place_type}
						onPress={() => {
							setSelectedPlace(place);
							setModalVisible(true);
						}}
					/>
				))}
			</MapView>

			<View style={styles.gatheringsList}>
				<Text variant="titleMedium" style={styles.gatheringsTitle}>
					Upcoming Gatherings
				</Text>
				{microGatherings.slice(0, 3).map((gathering) => (
					<Card key={gathering.id} style={styles.gatheringCard}>
						<Card.Content style={styles.gatheringContent}>
							<View style={styles.gatheringHeader}>
								<Text variant="titleSmall" numberOfLines={1}>
									{gathering.title}
								</Text>
								<Chip compact>
									{gathering.current_participants.length}/
									{gathering.max_participants}
								</Chip>
							</View>
							<Text variant="bodySmall" style={styles.gatheringTime}>
								{formatDate(gathering.scheduled_for)}
							</Text>
							<Text variant="bodySmall" numberOfLines={1}>
								📍 {gathering.third_place?.name}
							</Text>
						</Card.Content>
					</Card>
				))}
			</View>

			<Portal>
				<Modal
					visible={modalVisible}
					onDismiss={() => setModalVisible(false)}
					contentContainerStyle={styles.modal}
				>
					{selectedPlace && (
						<Surface style={styles.modalContent}>
							<Text variant="headlineSmall" style={styles.modalTitle}>
								{getPlaceIcon(selectedPlace.place_type)} {selectedPlace.name}
							</Text>

							<Text variant="bodyMedium" style={styles.modalAddress}>
								📍 {selectedPlace.address}
							</Text>

							{selectedPlace.description && (
								<Text variant="bodySmall" style={styles.modalDescription}>
									{selectedPlace.description}
								</Text>
							)}

							{selectedPlace.amenities.length > 0 && (
								<View style={styles.amenities}>
									<Text variant="titleSmall">Amenities:</Text>
									<View style={styles.amenityChips}>
										{selectedPlace.amenities.map((amenity, index) => (
											<Chip key={index} compact mode="outlined">
												{amenity}
											</Chip>
										))}
									</View>
								</View>
							)}

							{!createGatheringMode ? (
								<View style={styles.modalButtons}>
									<Button
										mode="outlined"
										onPress={() => setModalVisible(false)}
										style={styles.modalButton}
									>
										Close
									</Button>
									<Button
										mode="contained"
										onPress={() => setCreateGatheringMode(true)}
										style={styles.modalButton}
									>
										Host Gathering
									</Button>
								</View>
							) : (
								<View style={styles.createGatheringForm}>
									<TextInput
										label="Gathering Title"
										value={newGathering.title}
										onChangeText={(text) =>
											setNewGathering((prev) => ({ ...prev, title: text }))
										}
										mode="outlined"
										style={styles.formInput}
									/>
									<TextInput
										label="Activity Type"
										value={newGathering.activity_type}
										onChangeText={(text) =>
											setNewGathering((prev) => ({
												...prev,
												activity_type: text,
											}))
										}
										mode="outlined"
										placeholder="e.g., reading, board games, quiet work"
										style={styles.formInput}
									/>
									<TextInput
										label="Description (optional)"
										value={newGathering.description}
										onChangeText={(text) =>
											setNewGathering((prev) => ({
												...prev,
												description: text,
											}))
										}
										mode="outlined"
										multiline
										style={styles.formInput}
									/>

									<View style={styles.modalButtons}>
										<Button
											mode="outlined"
											onPress={() => {
												setCreateGatheringMode(false);
												setNewGathering({
													title: "",
													description: "",
													activity_type: "",
													duration_minutes: 60,
													max_participants: 4,
												});
											}}
											style={styles.modalButton}
										>
											Cancel
										</Button>
										<Button
											mode="contained"
											onPress={createMicroGathering}
											style={styles.modalButton}
										>
											Create
										</Button>
									</View>
								</View>
							)}
						</Surface>
					)}
				</Modal>
			</Portal>

			<FAB
				icon="plus"
				style={styles.fab}
				onPress={() => {
					Alert.alert(
						"Coming Soon",
						"Adding new third places will be available soon!"
					);
				}}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	map: {
		flex: 1,
	},
	gatheringsList: {
		position: "absolute",
		top: 50,
		left: theme.spacing.md,
		right: theme.spacing.md,
		backgroundColor: theme.colors.surface,
		borderRadius: 12,
		padding: theme.spacing.md,
		elevation: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 4,
	},
	gatheringsTitle: {
		marginBottom: theme.spacing.md,
		color: theme.colors.primary,
	},
	gatheringCard: {
		marginBottom: theme.spacing.sm,
		elevation: 1,
	},
	gatheringContent: {
		paddingVertical: theme.spacing.sm,
	},
	gatheringHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: theme.spacing.xs,
	},
	gatheringTime: {
		color: theme.colors.outline,
		marginBottom: theme.spacing.xs,
	},
	modal: {
		flex: 1,
		justifyContent: "center",
		padding: theme.spacing.md,
	},
	modalContent: {
		borderRadius: 16,
		padding: theme.spacing.lg,
		maxHeight: "80%",
	},
	modalTitle: {
		marginBottom: theme.spacing.md,
		color: theme.colors.primary,
		textAlign: "center",
	},
	modalAddress: {
		textAlign: "center",
		marginBottom: theme.spacing.md,
		color: theme.colors.outline,
	},
	modalDescription: {
		marginBottom: theme.spacing.md,
		lineHeight: 18,
	},
	amenities: {
		marginBottom: theme.spacing.lg,
	},
	amenityChips: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: theme.spacing.sm,
		marginTop: theme.spacing.sm,
	},
	createGatheringForm: {
		marginTop: theme.spacing.md,
	},
	formInput: {
		marginBottom: theme.spacing.md,
	},
	modalButtons: {
		flexDirection: "row",
		gap: theme.spacing.md,
	},
	modalButton: {
		flex: 1,
	},
	fab: {
		position: "absolute",
		bottom: theme.spacing.md,
		right: theme.spacing.md,
		backgroundColor: theme.colors.primary,
	},
});
