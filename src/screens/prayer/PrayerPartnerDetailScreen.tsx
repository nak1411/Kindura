// src/screens/prayer/PrayerPartnerDetailScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
	View,
	StyleSheet,
	FlatList,
	RefreshControl,
	Alert,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import {
	Text,
	Card,
	Button,
	Avatar,
	Surface,
	TextInput,
	IconButton,
	Divider,
} from "react-native-paper";
import { supabase } from "../../services/supabase";
import { useTheme } from "../../constants/theme-context";
import { PrayerPartnership, PrayerCheckIn, User } from "../../types";
import { PrayerPartnerService } from "../../services/PrayerPartnerService";

interface PrayerPartnerDetailScreenProps {
	route: {
		params: {
			partnershipId: string;
		};
	};
	navigation: any;
}

export default function PrayerPartnerDetailScreen({
	route,
	navigation,
}: PrayerPartnerDetailScreenProps) {
	const { partnershipId } = route.params;
	const { theme } = useTheme();

	// State
	const [user, setUser] = useState<User | null>(null);
	const [partnership, setPartnership] = useState<PrayerPartnership | null>(
		null
	);
	const [checkIns, setCheckIns] = useState<PrayerCheckIn[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [newCheckIn, setNewCheckIn] = useState("");
	const [sending, setSending] = useState(false);

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
			// Load partnership details
			const partnerships = await PrayerPartnerService.getMyPartnerships(
				user.id
			);
			const currentPartnership = partnerships.find(
				(p) => p.id === partnershipId
			);

			if (!currentPartnership) {
				Alert.alert("Error", "Partnership not found");
				navigation.goBack();
				return;
			}

			setPartnership(currentPartnership);

			// Load check-ins
			const checkInsData = await PrayerPartnerService.getRecentCheckIns(
				partnershipId
			);
			setCheckIns(checkInsData);
		} catch (error) {
			console.error("Error loading partnership data:", error);
			Alert.alert("Error", "Failed to load partnership details");
		} finally {
			setLoading(false);
		}
	};

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await loadData();
		setRefreshing(false);
	}, [loadData]);

	const handleSendCheckIn = async () => {
		if (!partnership || !user || !newCheckIn.trim()) return;

		setSending(true);
		try {
			const partnerId = partnership.partner_user?.id;
			if (!partnerId) return;

			await PrayerPartnerService.sendCheckIn(
				partnershipId,
				user.id,
				partnerId,
				newCheckIn.trim()
			);

			setNewCheckIn("");
			loadData(); // Refresh the check-ins
		} catch (error) {
			Alert.alert("Error", "Failed to send check-in");
		} finally {
			setSending(false);
		}
	};

	const handleSendPrayerRequest = () => {
		navigation.navigate("PrayerPartnersList", {
			openRequestModal: true,
			selectedPartnership: partnership,
		});
	};

	const renderCheckIn = ({ item }: { item: PrayerCheckIn }) => {
		const isFromMe = item.from_user_id === user?.id;
		const otherUser = isFromMe ? item.to_user : item.from_user;

		return (
			<Card
				style={[styles.checkInCard, { backgroundColor: theme.colors.surface }]}
			>
				<Card.Content>
					<View style={styles.checkInHeader}>
						<View style={styles.checkInInfo}>
							<Avatar.Text
								size={32}
								label={otherUser?.display_name?.charAt(0).toUpperCase() || "?"}
								style={{
									backgroundColor: isFromMe
										? theme.colors.primaryContainer
										: theme.colors.secondaryContainer,
								}}
							/>
							<View style={styles.checkInDetails}>
								<Text variant="bodyMedium">
									{isFromMe ? "You" : otherUser?.display_name}
								</Text>
								<Text
									variant="bodySmall"
									style={{ color: theme.colors.outline }}
								>
									{new Date(item.created_at).toLocaleDateString()} at{" "}
									{new Date(item.created_at).toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</Text>
							</View>
						</View>
					</View>

					{item.message && (
						<Text variant="bodyMedium" style={styles.checkInMessage}>
							{item.message}
						</Text>
					)}

					{item.response_message && (
						<View style={styles.responseContainer}>
							<Divider style={{ marginVertical: 8 }} />
							<Text
								variant="bodySmall"
								style={{ color: theme.colors.outline, marginBottom: 4 }}
							>
								Response:
							</Text>
							<Text variant="bodyMedium">{item.response_message}</Text>
						</View>
					)}
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
			padding: 16,
			paddingTop: 40,
		},
		headerContent: {
			flexDirection: "row",
			alignItems: "center",
		},
		backButton: {
			marginRight: 8,
		},
		headerInfo: {
			flex: 1,
			marginLeft: 8,
		},
		title: {
			color: theme.colors.onSurface,
		},
		subtitle: {
			color: theme.colors.outline,
		},
		partnerInfo: {
			flexDirection: "row",
			alignItems: "center",
			marginTop: 16,
			padding: 16,
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: 8,
		},
		partnerDetails: {
			marginLeft: 12,
			flex: 1,
		},
		partnerName: {
			color: theme.colors.onSurface,
		},
		partnershipDetails: {
			color: theme.colors.outline,
		},
		actionsContainer: {
			flexDirection: "row",
			padding: 16,
			gap: 8,
		},
		actionButton: {
			flex: 1,
		},
		checkInsContainer: {
			flex: 1,
		},
		sectionTitle: {
			padding: 16,
			paddingBottom: 8,
			color: theme.colors.onSurface,
		},
		checkInCard: {
			marginHorizontal: 16,
			marginBottom: 8,
		},
		checkInHeader: {
			marginBottom: 8,
		},
		checkInInfo: {
			flexDirection: "row",
			alignItems: "center",
		},
		checkInDetails: {
			marginLeft: 8,
		},
		checkInMessage: {
			color: theme.colors.onSurface,
			marginTop: 4,
		},
		responseContainer: {
			marginTop: 8,
		},
		inputContainer: {
			padding: 16,
			backgroundColor: theme.colors.surface,
		},
		inputRow: {
			flexDirection: "row",
			alignItems: "flex-end",
			gap: 8,
		},
		textInput: {
			flex: 1,
		},
		sendButton: {
			alignSelf: "flex-end",
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
	});

	if (loading) {
		return (
			<View
				style={[
					styles.container,
					{ justifyContent: "center", alignItems: "center" },
				]}
			>
				<Text>Loading partnership...</Text>
			</View>
		);
	}

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : "height"}
		>
			{/* Header */}
			<Surface style={styles.header}>
				<View style={styles.headerContent}>
					<IconButton
						icon="arrow-left"
						size={24}
						onPress={() => navigation.goBack()}
						style={styles.backButton}
					/>
					<View style={styles.headerInfo}>
						<Text variant="headlineSmall" style={styles.title}>
							Prayer Partnership
						</Text>
						<Text variant="bodyMedium" style={styles.subtitle}>
							with {partnership?.partner_user?.display_name}
						</Text>
					</View>
				</View>

				{/* Partner Info */}
				<View style={styles.partnerInfo}>
					<Avatar.Text
						size={48}
						label={
							partnership?.partner_user?.display_name
								?.charAt(0)
								.toUpperCase() || "?"
						}
						style={{ backgroundColor: theme.colors.primaryContainer }}
					/>
					<View style={styles.partnerDetails}>
						<Text variant="titleMedium" style={styles.partnerName}>
							{partnership?.partner_user?.display_name}
						</Text>
						<Text variant="bodySmall" style={styles.partnershipDetails}>
							{partnership?.partnership_type} •{" "}
							{partnership?.check_in_frequency} check-ins
						</Text>
						<Text variant="bodySmall" style={styles.partnershipDetails}>
							Prayer time: {partnership?.prayer_time_preference}
						</Text>
					</View>
				</View>

				{/* Quick Actions */}
				<View style={styles.actionsContainer}>
					<Button
						mode="contained"
						onPress={handleSendPrayerRequest}
						icon="hands-pray"
						style={styles.actionButton}
					>
						Prayer Request
					</Button>
					<Button
						mode="outlined"
						onPress={() => {
							// Could open partnership settings
							Alert.alert(
								"Coming Soon",
								"Partnership settings will be available soon!"
							);
						}}
						icon="cog"
						style={styles.actionButton}
					>
						Settings
					</Button>
				</View>
			</Surface>

			{/* Check-ins List */}
			<View style={styles.checkInsContainer}>
				<Text variant="titleMedium" style={styles.sectionTitle}>
					Recent Check-ins
				</Text>

				{checkIns.length > 0 ? (
					<FlatList
						data={checkIns}
						renderItem={renderCheckIn}
						keyExtractor={(item) => item.id}
						refreshControl={
							<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
						}
						contentContainerStyle={{ paddingBottom: 100 }}
					/>
				) : (
					<View style={styles.emptyState}>
						<IconButton
							icon="message-text-outline"
							size={48}
							iconColor={theme.colors.outline}
						/>
						<Text style={styles.emptyText}>
							No check-ins yet.{"\n"}
							Send a message to start connecting with your prayer partner.
						</Text>
					</View>
				)}
			</View>

			{/* Message Input */}
			<Surface style={styles.inputContainer}>
				<View style={styles.inputRow}>
					<TextInput
						value={newCheckIn}
						onChangeText={setNewCheckIn}
						placeholder="How can I pray for you today?"
						mode="outlined"
						multiline
						style={styles.textInput}
					/>
					<Button
						mode="contained"
						onPress={handleSendCheckIn}
						disabled={!newCheckIn.trim() || sending}
						loading={sending}
						style={styles.sendButton}
					>
						Send
					</Button>
				</View>
			</Surface>
		</KeyboardAvoidingView>
	);
}
