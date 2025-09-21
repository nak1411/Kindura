// src/screens/prayer/PrayerPartnerScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	StyleSheet,
	FlatList,
	RefreshControl,
	Alert,
	ScrollView,
} from "react-native";
import {
	Text,
	Card,
	Button,
	Avatar,
	Chip,
	FAB,
	Portal,
	Modal,
	Surface,
	TextInput,
	Switch,
	Divider,
	IconButton,
	Badge,
} from "react-native-paper";
import { supabase } from "../../services/supabase";
import { useTheme } from "../../constants/theme-context";
import { PrayerPartnership, PrayerRequest, User } from "../../types";
import { PrayerPartnerService } from "../../services/PrayerPartnerService";

interface PrayerPartnerScreenProps {
	navigation: any;
}

export default function PrayerPartnerScreen({
	navigation,
}: PrayerPartnerScreenProps) {
	const { theme } = useTheme();

	// State
	const [user, setUser] = useState<User | null>(null);
	const [partnerships, setPartnerships] = useState<PrayerPartnership[]>([]);
	const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	// Modal states
	const [showFindPartnerModal, setShowFindPartnerModal] = useState(false);
	const [showRequestModal, setShowRequestModal] = useState(false);
	const [selectedPartnership, setSelectedPartnership] =
		useState<PrayerPartnership | null>(null);

	// Form states
	const [newRequestText, setNewRequestText] = useState("");
	const [isUrgentRequest, setIsUrgentRequest] = useState(false);

	useEffect(() => {
		loadUser();
	}, []);

	useEffect(() => {
		if (user) {
			loadData();
		}
	}, [user]);

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

	const loadData = async () => {
		if (!user) return;

		setLoading(true);
		try {
			// Load partnerships and prayer requests in parallel
			const [partnershipsData, requestsData] = await Promise.all([
				PrayerPartnerService.getMyPartnerships(user.id),
				PrayerPartnerService.getPrayerRequests(user.id),
			]);

			setPartnerships(partnershipsData);
			setPrayerRequests(requestsData);
		} catch (error) {
			console.error("Error loading prayer data:", error);
			Alert.alert("Error", "Failed to load prayer partner data");
		} finally {
			setLoading(false);
		}
	};

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await loadData();
		setRefreshing(false);
	}, [loadData]);

	const handleAcceptPartnership = async (partnership: PrayerPartnership) => {
		try {
			await PrayerPartnerService.respondToPartnerRequest(partnership.id, true);
			Alert.alert(
				"Partnership Accepted!",
				"You can now pray together and support each other."
			);
			loadData();
		} catch (error) {
			Alert.alert("Error", "Failed to accept partnership request");
		}
	};

	const handleDeclinePartnership = async (partnership: PrayerPartnership) => {
		Alert.alert(
			"Decline Request",
			"Are you sure you want to decline this prayer partnership?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Decline",
					style: "destructive",
					onPress: async () => {
						try {
							await PrayerPartnerService.respondToPartnerRequest(
								partnership.id,
								false
							);
							loadData();
						} catch (error) {
							Alert.alert("Error", "Failed to decline partnership request");
						}
					},
				},
			]
		);
	};

	const handleSendPrayerRequest = async () => {
		if (!selectedPartnership || !user || !newRequestText.trim()) return;

		try {
			const partnerId = selectedPartnership.partner_user?.id;
			if (!partnerId) return;

			await PrayerPartnerService.sendPrayerRequest(
				selectedPartnership.id,
				user.id,
				partnerId,
				newRequestText.trim(),
				isUrgentRequest
			);

			setNewRequestText("");
			setIsUrgentRequest(false);
			setShowRequestModal(false);
			setSelectedPartnership(null);

			Alert.alert(
				"Prayer Request Sent",
				"Your prayer partner will be notified."
			);
			loadData();
		} catch (error) {
			Alert.alert("Error", "Failed to send prayer request");
		}
	};

	const getPartnershipStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return theme.colors.primary;
			case "pending":
				return theme.colors.outline;
			case "paused":
				return theme.colors.onSurfaceVariant;
			default:
				return theme.colors.outline;
		}
	};

	const getPartnershipStatusText = (partnership: PrayerPartnership) => {
		if (partnership.status === "pending") {
			const isRequester = partnership.requested_by === user?.id;
			return isRequester ? "Request Sent" : "Request Received";
		}
		return (
			partnership.status.charAt(0).toUpperCase() + partnership.status.slice(1)
		);
	};

	const renderPartnership = ({ item }: { item: PrayerPartnership }) => {
		const partner = item.partner_user;
		const isRequester = item.requested_by === user?.id;
		const isPending = item.status === "pending";
		const canInteract = item.status === "active";

		return (
			<Card
				style={[
					styles.partnershipCard,
					{ backgroundColor: theme.colors.surface },
				]}
			>
				<Card.Content>
					<View style={styles.partnershipHeader}>
						<View style={styles.partnerInfo}>
							<Avatar.Text
								size={48}
								label={partner?.display_name?.charAt(0).toUpperCase() || "?"}
								style={{ backgroundColor: theme.colors.primaryContainer }}
							/>
							<View style={styles.partnerDetails}>
								<Text variant="titleMedium">
									{partner?.display_name || "Unknown"}
								</Text>
								<Text
									variant="bodySmall"
									style={{ color: theme.colors.outline }}
								>
									{item.partnership_type} • {item.check_in_frequency}
								</Text>
							</View>
						</View>
						<Chip
							mode="outlined"
							textStyle={{ color: getPartnershipStatusColor(item.status) }}
							style={{ borderColor: getPartnershipStatusColor(item.status) }}
						>
							{getPartnershipStatusText(item)}
						</Chip>
					</View>

					{isPending && !isRequester && (
						<View style={styles.pendingActions}>
							<Button
								mode="contained"
								onPress={() => handleAcceptPartnership(item)}
								style={{ marginRight: 8 }}
							>
								Accept
							</Button>
							<Button
								mode="outlined"
								onPress={() => handleDeclinePartnership(item)}
							>
								Decline
							</Button>
						</View>
					)}

					{canInteract && (
						<View style={styles.partnershipActions}>
							<Button
								mode="outlined"
								onPress={() => {
									setSelectedPartnership(item);
									setShowRequestModal(true);
								}}
								icon="hands-pray"
								style={{ marginRight: 8 }}
							>
								Prayer Request
							</Button>
							<Button
								mode="contained"
								onPress={() =>
									navigation.navigate("PrayerPartnerDetail", {
										partnershipId: item.id,
									})
								}
								icon="message"
							>
								Check In
							</Button>
						</View>
					)}
				</Card.Content>
			</Card>
		);
	};

	const renderPrayerRequest = ({ item }: { item: PrayerRequest }) => {
		const isFromMe = item.from_user_id === user?.id;
		const otherUser = isFromMe ? item.to_user : item.from_user;

		return (
			<Card
				style={[styles.requestCard, { backgroundColor: theme.colors.surface }]}
			>
				<Card.Content>
					<View style={styles.requestHeader}>
						<View style={styles.requestInfo}>
							<Avatar.Text
								size={32}
								label={otherUser?.display_name?.charAt(0).toUpperCase() || "?"}
								style={{ backgroundColor: theme.colors.secondaryContainer }}
							/>
							<View style={styles.requestDetails}>
								<Text variant="bodyMedium">
									{isFromMe
										? `To ${otherUser?.display_name}`
										: `From ${otherUser?.display_name}`}
								</Text>
								<Text
									variant="bodySmall"
									style={{ color: theme.colors.outline }}
								>
									{new Date(item.created_at).toLocaleDateString()}
								</Text>
							</View>
						</View>
						{item.is_urgent && (
							<Chip
								mode="flat"
								textStyle={{ color: theme.colors.error }}
								style={{ backgroundColor: theme.colors.errorContainer }}
							>
								Urgent
							</Chip>
						)}
					</View>

					<Text variant="bodyMedium" style={styles.requestText}>
						{item.request_text}
					</Text>

					{!isFromMe && item.status === "active" && (
						<View style={styles.requestActions}>
							<Button
								mode="outlined"
								onPress={() => {
									// Navigate to mark as answered screen
									navigation.navigate("AnswerPrayer", { requestId: item.id });
								}}
								icon="check"
							>
								Mark as Answered
							</Button>
						</View>
					)}
				</Card.Content>
			</Card>
		);
	};

	const activePartnerships = partnerships.filter((p) => p.status === "active");
	const pendingPartnerships = partnerships.filter(
		(p) => p.status === "pending"
	);
	const urgentRequests = prayerRequests.filter(
		(r) => r.is_urgent && r.status === "active"
	);

	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.colors.background,
		},
		header: {
			backgroundColor: theme.colors.surface,
			padding: 16,
			paddingTop: 40,
		},
		title: {
			color: theme.colors.onSurface,
			marginBottom: 4,
		},
		subtitle: {
			color: theme.colors.outline,
		},
		section: {
			marginBottom: 16,
		},
		sectionHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			paddingHorizontal: 16,
			paddingVertical: 8,
		},
		sectionTitle: {
			color: theme.colors.onSurface,
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
		partnershipCard: {
			marginHorizontal: 16,
			marginBottom: 8,
		},
		partnershipHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 12,
		},
		partnerInfo: {
			flexDirection: "row",
			alignItems: "center",
		},
		partnerDetails: {
			marginLeft: 12,
		},
		pendingActions: {
			flexDirection: "row",
			marginTop: 8,
		},
		partnershipActions: {
			flexDirection: "row",
			marginTop: 8,
		},
		requestCard: {
			marginHorizontal: 16,
			marginBottom: 8,
		},
		requestHeader: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 8,
		},
		requestInfo: {
			flexDirection: "row",
			alignItems: "center",
		},
		requestDetails: {
			marginLeft: 8,
		},
		requestText: {
			marginVertical: 8,
			color: theme.colors.onSurface,
		},
		requestActions: {
			marginTop: 8,
		},
		fab: {
			position: "absolute",
			margin: 16,
			right: 0,
			bottom: 0,
			backgroundColor: theme.colors.primary,
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
		input: {
			marginBottom: 16,
		},
		switchRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
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
				<Text variant="headlineMedium" style={styles.title}>
					Prayer Partners
				</Text>
				<Text variant="bodyMedium" style={styles.subtitle}>
					Connect with others for prayer and spiritual support
				</Text>
				{urgentRequests.length > 0 && (
					<View style={{ marginTop: 8 }}>
						<Chip
							mode="flat"
							icon="alert"
							textStyle={{ color: theme.colors.error }}
							style={{ backgroundColor: theme.colors.errorContainer }}
						>
							{urgentRequests.length} urgent prayer request
							{urgentRequests.length !== 1 ? "s" : ""}
						</Chip>
					</View>
				)}
			</Surface>

			<ScrollView
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
			>
				{/* Pending Requests Section */}
				{pendingPartnerships.length > 0 && (
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text variant="titleMedium" style={styles.sectionTitle}>
								Pending Requests
							</Text>
							<Badge size={24}>{pendingPartnerships.length}</Badge>
						</View>
						<FlatList
							data={pendingPartnerships}
							renderItem={renderPartnership}
							keyExtractor={(item) => item.id}
							scrollEnabled={false}
						/>
					</View>
				)}

				{/* Active Partnerships Section */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text variant="titleMedium" style={styles.sectionTitle}>
							Active Prayer Partners
						</Text>
						{activePartnerships.length > 0 && (
							<Badge size={24}>{activePartnerships.length}</Badge>
						)}
					</View>
					{activePartnerships.length > 0 ? (
						<FlatList
							data={activePartnerships}
							renderItem={renderPartnership}
							keyExtractor={(item) => item.id}
							scrollEnabled={false}
						/>
					) : (
						<View style={styles.emptyState}>
							<IconButton
								icon="account-heart"
								size={48}
								iconColor={theme.colors.outline}
							/>
							<Text style={styles.emptyText}>
								No active prayer partners yet.{"\n"}
								Find someone to pray with and support each other.
							</Text>
						</View>
					)}
				</View>

				{/* Recent Prayer Requests Section */}
				{prayerRequests.length > 0 && (
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text variant="titleMedium" style={styles.sectionTitle}>
								Recent Prayer Requests
							</Text>
							<Badge size={24}>{prayerRequests.length}</Badge>
						</View>
						<FlatList
							data={prayerRequests.slice(0, 5)} // Show only recent 5
							renderItem={renderPrayerRequest}
							keyExtractor={(item) => item.id}
							scrollEnabled={false}
						/>
						{prayerRequests.length > 5 && (
							<Button
								mode="outlined"
								onPress={() => navigation.navigate("AllPrayerRequests")}
								style={{ margin: 16 }}
							>
								View All Requests
							</Button>
						)}
					</View>
				)}
			</ScrollView>

			{/* Find Partner FAB */}
			<FAB
				icon="account-plus"
				style={styles.fab}
				onPress={() => navigation.navigate("FindPrayerPartner")}
				label="Find Partner"
			/>

			{/* Prayer Request Modal */}
			<Portal>
				<Modal
					visible={showRequestModal}
					onDismiss={() => {
						setShowRequestModal(false);
						setSelectedPartnership(null);
						setNewRequestText("");
						setIsUrgentRequest(false);
					}}
					contentContainerStyle={styles.modalContainer}
				>
					<Surface style={styles.modalContent}>
						<Text variant="titleLarge" style={styles.modalTitle}>
							Send Prayer Request
						</Text>

						<Text
							variant="bodyMedium"
							style={{ marginBottom: 16, color: theme.colors.outline }}
						>
							To: {selectedPartnership?.partner_user?.display_name}
						</Text>

						<TextInput
							label="Prayer request"
							value={newRequestText}
							onChangeText={setNewRequestText}
							mode="outlined"
							multiline
							numberOfLines={4}
							placeholder="Share what you'd like prayer for..."
							style={styles.input}
						/>

						<View style={styles.switchRow}>
							<Text variant="bodyMedium">Mark as urgent</Text>
							<Switch
								value={isUrgentRequest}
								onValueChange={setIsUrgentRequest}
							/>
						</View>

						<View style={styles.modalActions}>
							<Button
								onPress={() => {
									setShowRequestModal(false);
									setSelectedPartnership(null);
									setNewRequestText("");
									setIsUrgentRequest(false);
								}}
							>
								Cancel
							</Button>
							<Button
								mode="contained"
								onPress={handleSendPrayerRequest}
								disabled={!newRequestText.trim()}
							>
								Send Request
							</Button>
						</View>
					</Surface>
				</Modal>
			</Portal>
		</View>
	);
}
