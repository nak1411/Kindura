// src/screens/prayer/FindPrayerPartnerScreen.tsx
import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, Alert, ScrollView } from "react-native";
import {
	Text,
	Card,
	Button,
	Avatar,
	Chip,
	Surface,
	TextInput,
	Switch,
	Portal,
	Modal,
	IconButton,
	SegmentedButtons,
} from "react-native-paper";
import { supabase } from "../../services/supabase";
import { useTheme } from "../../constants/theme-context";
import { User, PrayerPreferences } from "../../types";
import { PrayerPartnerService } from "../../services/PrayerPartnerService";

interface FindPrayerPartnerScreenProps {
	route: any;
	navigation: any;
}

export default function FindPrayerPartnerScreen({
	navigation,
}: FindPrayerPartnerScreenProps) {
	const { theme } = useTheme();

	// State
	const [user, setUser] = useState<User | null>(null);
	const [potentialPartners, setPotentialPartners] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchDistance, setSearchDistance] = useState(25); // miles

	// Modal states
	const [showRequestModal, setShowRequestModal] = useState(false);
	const [selectedUser, setSelectedUser] = useState<User | null>(null);

	// Request form state
	const [requestMessage, setRequestMessage] = useState("");
	const [prayerTime, setPrayerTime] = useState("flexible");
	const [checkInFrequency, setCheckInFrequency] = useState("daily");
	const [partnershipType, setPartnershipType] = useState("general");

	useEffect(() => {
		loadUser();
	}, []);

	useEffect(() => {
		if (user) {
			findPotentialPartners();
		}
	}, [user]); // Removed searchDistance from dependency array

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
			}
		} catch (error) {
			console.error("Error loading user:", error);
		}
	};

	const findPotentialPartners = async () => {
		if (!user) return;

		setLoading(true);
		try {
			// Always search without distance first for broader results
			const partners = await PrayerPartnerService.findPotentialPartners(
				user.id
			);
			setPotentialPartners(partners);
		} catch (error) {
			console.error("Error finding potential partners:", error);
			Alert.alert("Error", "Failed to find potential prayer partners");
		} finally {
			setLoading(false);
		}
	};

	const handleSendRequest = async () => {
		if (!selectedUser || !user) return;

		try {
			await PrayerPartnerService.sendPartnerRequest(user.id, selectedUser.id, {
				prayer_time_preference: prayerTime,
				check_in_frequency: checkInFrequency,
				partnership_type: partnershipType,
			});

			setShowRequestModal(false);
			setSelectedUser(null);
			Alert.alert(
				"Request Sent!",
				`Your prayer partnership request has been sent to ${selectedUser.display_name}.`,
				[
					{
						text: "OK",
						onPress: () => navigation.goBack(),
					},
				]
			);
		} catch (error) {
			Alert.alert("Error", "Failed to send partnership request");
		}
	};

	const getUserDistance = (partner: User) => {
		if (
			!user?.location_lat ||
			!user?.location_lng ||
			!partner.location_lat ||
			!partner.location_lng
		) {
			return null;
		}

		// Simple distance calculation (you might want to use a proper geolocation library)
		const R = 3959; // Earth's radius in miles
		const dLat = ((partner.location_lat - user.location_lat) * Math.PI) / 180;
		const dLng = ((partner.location_lng - user.location_lng) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos((user.location_lat * Math.PI) / 180) *
				Math.cos((partner.location_lat * Math.PI) / 180) *
				Math.sin(dLng / 2) *
				Math.sin(dLng / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		const distance = R * c;

		return Math.round(distance * 10) / 10; // Round to 1 decimal place
	};

	const renderPotentialPartner = ({ item }: { item: User }) => {
		const distance = getUserDistance(item);
		const prayerPrefs = item.preferences?.prayer as PrayerPreferences;

		return (
			<Card
				style={[styles.partnerCard, { backgroundColor: theme.colors.surface }]}
			>
				<Card.Content>
					<View style={styles.partnerHeader}>
						<View style={styles.partnerInfo}>
							<Avatar.Text
								size={56}
								label={item.display_name?.charAt(0).toUpperCase() || "?"}
								style={{ backgroundColor: theme.colors.primaryContainer }}
							/>
							<View style={styles.partnerDetails}>
								<Text variant="titleMedium">{item.display_name}</Text>
								{distance && (
									<Text
										variant="bodySmall"
										style={{ color: theme.colors.outline }}
									>
										📍 {distance} miles away
									</Text>
								)}
								<Text
									variant="bodySmall"
									style={{ color: theme.colors.outline }}
								>
									Care Score: {item.care_score || 0}
								</Text>
							</View>
						</View>
					</View>

					{item.bio && (
						<Text variant="bodyMedium" style={styles.bio}>
							{item.bio}
						</Text>
					)}

					{prayerPrefs && (
						<View style={styles.preferences}>
							{prayerPrefs.preferred_time && (
								<Chip mode="outlined" compact style={styles.prefChip}>
									🕐 {prayerPrefs.preferred_time}
								</Chip>
							)}
							{prayerPrefs.frequency && (
								<Chip mode="outlined" compact style={styles.prefChip}>
									📅 {prayerPrefs.frequency}
								</Chip>
							)}
							{prayerPrefs.partnership_type && (
								<Chip mode="outlined" compact style={styles.prefChip}>
									🤝 {prayerPrefs.partnership_type}
								</Chip>
							)}
						</View>
					)}

					<Button
						mode="contained"
						onPress={() => {
							setSelectedUser(item);
							setShowRequestModal(true);
						}}
						style={styles.requestButton}
						icon="hands-pray"
					>
						Send Partnership Request
					</Button>
				</Card.Content>
			</Card>
		);
	};

	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.colors.background,
		},
		header: {
			backgroundColor: theme.colors.surface,
			paddingTop: 40,
			paddingBottom: 16,
			paddingHorizontal: 16,
		},
		headerContent: {
			flexDirection: "row",
			alignItems: "flex-start",
			minHeight: 56, // Ensure enough height for the content
		},
		backButton: {
			marginRight: 12,
			marginTop: -8, // Align with title baseline
		},
		headerText: {
			flex: 1,
			paddingTop: 8, // Add some top padding to align with back button
		},
		title: {
			color: theme.colors.onSurface,
			marginBottom: 4,
		},
		subtitle: {
			color: theme.colors.outline,
		},
		filters: {
			flexDirection: "row",
			alignItems: "center",
			marginTop: 8,
		},
		distanceLabel: {
			color: theme.colors.onSurface,
			marginRight: 8,
		},
		distanceInput: {
			width: 80,
			height: 40,
		},
		emptyState: {
			alignItems: "center",
			paddingVertical: 32,
			paddingHorizontal: 16,
		},
		emptyText: {
			color: theme.colors.outline,
			textAlign: "center",
			marginTop: 8,
		},
		partnerCard: {
			marginHorizontal: 16,
			marginBottom: 12,
		},
		partnerHeader: {
			marginBottom: 12,
		},
		partnerInfo: {
			flexDirection: "row",
			alignItems: "center",
		},
		partnerDetails: {
			marginLeft: 12,
			flex: 1,
		},
		bio: {
			color: theme.colors.onSurface,
			marginBottom: 12,
			fontStyle: "italic",
		},
		preferences: {
			flexDirection: "row",
			flexWrap: "wrap",
			marginBottom: 12,
			gap: 4,
		},
		prefChip: {
			marginRight: 4,
			marginBottom: 4,
		},
		requestButton: {
			marginTop: 8,
		},
		modalContainer: {
			backgroundColor: "rgba(0,0,0,0.5)",
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
		},
		modalContent: {
			backgroundColor: theme.colors.surface,
			margin: 20,
			borderRadius: 12,
			padding: 20,
			width: "90%",
			maxWidth: 400,
		},
		modalTitle: {
			color: theme.colors.onSurface,
			marginBottom: 16,
		},
		modalSection: {
			marginBottom: 16,
		},
		modalSectionTitle: {
			color: theme.colors.onSurface,
			marginBottom: 8,
		},
		segmentedButtons: {
			marginBottom: 8,
		},
		input: {
			marginBottom: 16,
		},
		modalActions: {
			flexDirection: "row",
			justifyContent: "flex-end",
			gap: 8,
			marginTop: 16,
		},
	});

	return (
		<View style={styles.container}>
			{/* Header */}
			<Surface style={styles.header}>
				<View style={styles.headerContent}>
					<IconButton
						icon="arrow-left"
						size={24}
						onPress={() => navigation.goBack()}
						style={styles.backButton}
					/>
					<View style={styles.headerText}>
						<Text variant="headlineMedium" style={styles.title}>
							Find Prayer Partner
						</Text>
						<Text variant="bodyMedium" style={styles.subtitle}>
							Connect with other Christians for prayer and spiritual support
						</Text>
					</View>
				</View>
			</Surface>

			{/* Potential Partners List */}
			{loading ? (
				<View style={styles.emptyState}>
					<Text style={styles.emptyText}>
						Finding potential prayer partners...
					</Text>
				</View>
			) : potentialPartners.length > 0 ? (
				<FlatList
					data={potentialPartners}
					renderItem={renderPotentialPartner}
					keyExtractor={(item) => item.id}
					contentContainerStyle={{ paddingVertical: 16 }}
				/>
			) : (
				<View style={styles.emptyState}>
					<IconButton
						icon="account-search"
						size={48}
						iconColor={theme.colors.outline}
					/>
					<Text style={styles.emptyText}>
						No potential prayer partners found.{"\n"}
						Try checking back later for new members.
					</Text>
					<Button
						mode="outlined"
						onPress={findPotentialPartners}
						style={{ marginTop: 16 }}
					>
						Refresh Search
					</Button>
				</View>
			)}

			{/* Partnership Request Modal */}
			<Portal>
				<Modal
					visible={showRequestModal}
					onDismiss={() => {
						setShowRequestModal(false);
						setSelectedUser(null);
					}}
					contentContainerStyle={styles.modalContainer}
				>
					<Surface style={styles.modalContent}>
						<Text variant="titleLarge" style={styles.modalTitle}>
							Send Partnership Request
						</Text>

						<Text
							variant="bodyMedium"
							style={{ marginBottom: 16, color: theme.colors.outline }}
						>
							To: {selectedUser?.display_name}
						</Text>

						<View style={styles.modalSection}>
							<Text variant="bodyLarge" style={styles.modalSectionTitle}>
								Preferred Prayer Time
							</Text>
							<SegmentedButtons
								value={prayerTime}
								onValueChange={setPrayerTime}
								buttons={[
									{ value: "morning", label: "Morning" },
									{ value: "evening", label: "Evening" },
									{ value: "flexible", label: "Flexible" },
								]}
								style={styles.segmentedButtons}
							/>
						</View>

						<View style={styles.modalSection}>
							<Text variant="bodyLarge" style={styles.modalSectionTitle}>
								Check-in Frequency
							</Text>
							<SegmentedButtons
								value={checkInFrequency}
								onValueChange={setCheckInFrequency}
								buttons={[
									{ value: "daily", label: "Daily" },
									{ value: "weekly", label: "Weekly" },
									{ value: "flexible", label: "Flexible" },
								]}
								style={styles.segmentedButtons}
							/>
						</View>

						<View style={styles.modalSection}>
							<Text variant="bodyLarge" style={styles.modalSectionTitle}>
								Partnership Type
							</Text>
							<SegmentedButtons
								value={partnershipType}
								onValueChange={setPartnershipType}
								buttons={[
									{ value: "general", label: "General" },
									{ value: "accountability", label: "Accountability" },
								]}
								style={styles.segmentedButtons}
							/>
						</View>

						<TextInput
							label="Optional message"
							value={requestMessage}
							onChangeText={setRequestMessage}
							mode="outlined"
							multiline
							numberOfLines={3}
							placeholder="Share why you'd like to be prayer partners..."
							style={styles.input}
						/>

						<View style={styles.modalActions}>
							<Button
								onPress={() => {
									setShowRequestModal(false);
									setSelectedUser(null);
								}}
							>
								Cancel
							</Button>
							<Button mode="contained" onPress={handleSendRequest}>
								Send Request
							</Button>
						</View>
					</Surface>
				</Modal>
			</Portal>
		</View>
	);
}
