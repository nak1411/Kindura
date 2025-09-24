// src/screens/debug/SimulationScreen.tsx
import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
	Text,
	Card,
	Button,
	Surface,
	TextInput,
	Switch,
	Chip,
	ProgressBar,
	Divider,
	SegmentedButtons,
} from "react-native-paper";
import * as Location from "expo-location";
import { useTheme } from "../../constants/theme-context";
import { UserSimulatorService } from "../../services/UserSimulatorService";
import { supabase } from "../../services/supabase";

interface BotConfig {
	count: number;
	responseSpeed: "instant" | "realistic" | "slow";
	activityLevel: "low" | "medium" | "high";
	personalityMix: {
		encouraging: number;
		thoughtful: number;
		prayer_focused: number;
		casual: number;
	};
	behaviors: {
		joinRooms: boolean;
		sendMessages: boolean;
		prayerRequests: boolean;
		respondToMessages: boolean;
		moveAround: boolean;
	};
	locationSpread: number; // km radius
}

export default function SimulationScreen() {
	const { theme } = useTheme();

	// Bot configuration
	const [botConfig, setBotConfig] = useState<BotConfig>({
		count: 6,
		responseSpeed: "realistic",
		activityLevel: "medium",
		personalityMix: {
			encouraging: 25,
			thoughtful: 25,
			prayer_focused: 25,
			casual: 25,
		},
		behaviors: {
			joinRooms: true,
			sendMessages: true,
			prayerRequests: true,
			respondToMessages: true,
			moveAround: false,
		},
		locationSpread: 5,
	});

	// Status
	const [isRunning, setIsRunning] = useState(false);
	const [activeSimId, setActiveSimId] = useState<string | null>(null);
	const [currentLocation, setCurrentLocation] =
		useState<Location.LocationObject | null>(null);
	const [botStats, setBotStats] = useState({
		activeBots: 0,
		messagesPerHour: 0,
		roomsWithBots: 0,
		prayerRequests: 0,
	});

	useEffect(() => {
		getCurrentLocation();
		updateBotStats();

		const interval = setInterval(updateBotStats, 3000);
		return () => clearInterval(interval);
	}, []);

	const getCurrentLocation = async () => {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status === "granted") {
				const location = await Location.getCurrentPositionAsync({});
				setCurrentLocation(location);
			}
		} catch (error) {
			console.error("Error getting location:", error);
		}
	};

	const updateBotStats = async () => {
		try {
			const { data: bots } = await supabase
				.from("users")
				.select("id, last_active")
				.eq("is_simulated", true);

			const activeBots =
				bots?.filter((bot) => {
					const lastActive = new Date(bot.last_active);
					const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
					return lastActive > fiveMinutesAgo;
				}).length || 0;

			// Count bot messages in last hour
			const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
			const { data: messages } = await supabase
				.from("room_messages")
				.select("id, user_id")
				.gte("created_at", oneHourAgo.toISOString());

			const botIds = bots?.map((bot) => bot.id) || [];
			const botMessages =
				messages?.filter((msg) => botIds.includes(msg.user_id)).length || 0;

			// Count rooms with bot participants
			const { data: rooms } = await supabase
				.from("room_participants")
				.select("room_id, user_id")
				.eq("is_active", true);

			const roomsWithBots = new Set(
				rooms
					?.filter((p) => botIds.includes(p.user_id))
					.map((p) => p.room_id) || []
			).size;

			// Count active prayer requests from bots
			const { data: prayers } = await supabase
				.from("prayer_requests")
				.select("id, from_user_id")
				.eq("status", "active");

			const botPrayers =
				prayers?.filter((p) => botIds.includes(p.from_user_id)).length || 0;

			setBotStats({
				activeBots,
				messagesPerHour: botMessages,
				roomsWithBots,
				prayerRequests: botPrayers,
			});
		} catch (error) {
			console.error("Error updating bot stats:", error);
		}
	};

	const startBots = async () => {
		if (!currentLocation) {
			Alert.alert(
				"Location Required",
				"Please allow location access to position bots nearby."
			);
			return;
		}

		try {
			setIsRunning(true);

			const simId = await UserSimulatorService.startAdvancedSimulation({
				...botConfig,
				centerLat: currentLocation.coords.latitude,
				centerLng: currentLocation.coords.longitude,
			});

			setActiveSimId(simId);

			Alert.alert(
				"Bots Started!",
				`${botConfig.count} AI bots are now active. They'll behave like real users based on your settings.`
			);
		} catch (error) {
			console.error("Error starting bots:", error);
			Alert.alert("Error", "Failed to start bots");
			setIsRunning(false);
		}
	};

	const stopBots = () => {
		if (activeSimId) {
			UserSimulatorService.stopSimulation(activeSimId);
			setActiveSimId(null);
			setIsRunning(false);
			Alert.alert(
				"Bots Stopped",
				"All AI bots have been deactivated and removed."
			);
		}
	};

	const updatePersonalityMix = (
		personality: keyof BotConfig["personalityMix"],
		value: number
	): void => {
		const remaining = 100 - value;
		const others = Object.keys(botConfig.personalityMix).filter(
			(k) => k !== personality
		) as (keyof BotConfig["personalityMix"])[];
		const othersTotal = others.reduce(
			(sum, key) => sum + botConfig.personalityMix[key],
			0
		);

		const newMix = { ...botConfig.personalityMix, [personality]: value };

		if (othersTotal > 0) {
			others.forEach((key) => {
				newMix[key] = Math.round((newMix[key] / othersTotal) * remaining);
			});
		}

		setBotConfig({ ...botConfig, personalityMix: newMix });
	};

	const resetToDefaults = () => {
		setBotConfig({
			count: 6,
			responseSpeed: "realistic",
			activityLevel: "medium",
			personalityMix: {
				encouraging: 25,
				thoughtful: 25,
				prayer_focused: 25,
				casual: 25,
			},
			behaviors: {
				joinRooms: true,
				sendMessages: true,
				prayerRequests: true,
				respondToMessages: true,
				moveAround: false,
			},
			locationSpread: 5,
		});
	};

	return (
		<ScrollView style={styles.container}>
			{/* Header */}
			<Surface style={styles.header}>
				<Text variant="headlineSmall" style={styles.title}>
					AI Bot Users
				</Text>
				<Text variant="bodyMedium" style={styles.subtitle}>
					Realistic bot users that chat, pray, and interact naturally
				</Text>
			</Surface>

			{/* Status Card */}
			<Card style={styles.card}>
				<Card.Content>
					<View style={styles.statusRow}>
						<Text variant="titleMedium">Bot Status</Text>
						<Chip
							mode="flat"
							style={{
								backgroundColor: isRunning
									? theme.colors.primaryContainer
									: theme.colors.surfaceVariant,
							}}
						>
							{isRunning ? `${botStats.activeBots} Active` : "Stopped"}
						</Chip>
					</View>

					{isRunning && (
						<>
							<Divider style={{ marginVertical: 12 }} />
							<View style={styles.statsGrid}>
								<View style={styles.statItem}>
									<Text variant="headlineSmall" style={styles.statNumber}>
										{botStats.messagesPerHour}
									</Text>
									<Text variant="bodySmall" style={styles.statLabel}>
										Messages/Hour
									</Text>
								</View>

								<View style={styles.statItem}>
									<Text variant="headlineSmall" style={styles.statNumber}>
										{botStats.roomsWithBots}
									</Text>
									<Text variant="bodySmall" style={styles.statLabel}>
										Rooms Joined
									</Text>
								</View>

								<View style={styles.statItem}>
									<Text variant="headlineSmall" style={styles.statNumber}>
										{botStats.prayerRequests}
									</Text>
									<Text variant="bodySmall" style={styles.statLabel}>
										Prayer Requests
									</Text>
								</View>
							</View>
						</>
					)}
				</Card.Content>
			</Card>

			{/* Bot Count & Activity */}
			<Card style={styles.card}>
				<Card.Content>
					<Text variant="titleMedium" style={{ marginBottom: 16 }}>
						Bot Configuration
					</Text>

					<View style={styles.configRow}>
						<View style={styles.configItem}>
							<Text variant="bodyMedium">Number of Bots</Text>
							<TextInput
								value={botConfig.count.toString()}
								onChangeText={(text) =>
									setBotConfig({ ...botConfig, count: parseInt(text) || 0 })
								}
								keyboardType="numeric"
								mode="outlined"
								dense
								style={styles.input}
							/>
						</View>

						<View style={styles.configItem}>
							<Text variant="bodyMedium">Location Spread</Text>
							<TextInput
								value={botConfig.locationSpread.toString()}
								onChangeText={(text) =>
									setBotConfig({
										...botConfig,
										locationSpread: parseFloat(text) || 0,
									})
								}
								keyboardType="numeric"
								mode="outlined"
								dense
								style={styles.input}
							/>
							<Text variant="bodySmall" style={styles.inputLabel}>
								km radius
							</Text>
						</View>
					</View>

					<Text variant="bodyMedium" style={{ marginTop: 16, marginBottom: 8 }}>
						Response Speed
					</Text>
					<SegmentedButtons
						value={botConfig.responseSpeed}
						onValueChange={(value) =>
							setBotConfig({ ...botConfig, responseSpeed: value as any })
						}
						buttons={[
							{ value: "instant", label: "Instant" },
							{ value: "realistic", label: "Realistic" },
							{ value: "slow", label: "Slow" },
						]}
						style={{ marginBottom: 16 }}
					/>

					<Text variant="bodyMedium" style={{ marginBottom: 8 }}>
						Overall Activity Level
					</Text>
					<SegmentedButtons
						value={botConfig.activityLevel}
						onValueChange={(value) =>
							setBotConfig({ ...botConfig, activityLevel: value as any })
						}
						buttons={[
							{ value: "low", label: "Low" },
							{ value: "medium", label: "Medium" },
							{ value: "high", label: "High" },
						]}
					/>
				</Card.Content>
			</Card>

			{/* Personality Mix */}
			<Card style={styles.card}>
				<Card.Content>
					<Text variant="titleMedium" style={{ marginBottom: 16 }}>
						Personality Distribution
					</Text>

					{Object.entries(botConfig.personalityMix).map(
						([personality, percentage]) => (
							<View key={personality} style={styles.personalityRow}>
								<View style={styles.personalityHeader}>
									<Text
										variant="bodyMedium"
										style={{ textTransform: "capitalize" }}
									>
										{personality.replace("_", " ")} ({percentage}%)
									</Text>
								</View>
								<View style={styles.sliderContainer}>
									<Button
										mode="outlined"
										compact
										onPress={() =>
											updatePersonalityMix(
												personality as keyof BotConfig["personalityMix"],
												Math.max(0, percentage - 5)
											)
										}
										style={styles.sliderButton}
									>
										-
									</Button>
									<View style={styles.sliderTrack}>
										<View
											style={[styles.sliderFill, { width: `${percentage}%` }]}
										/>
									</View>
									<Button
										mode="outlined"
										compact
										onPress={() =>
											updatePersonalityMix(
												personality as keyof BotConfig["personalityMix"],
												Math.min(100, percentage + 5)
											)
										}
										style={styles.sliderButton}
									>
										+
									</Button>
								</View>
							</View>
						)
					)}

					<Text variant="bodySmall" style={styles.note}>
						Adjust how many bots have each personality type
					</Text>
				</Card.Content>
			</Card>

			{/* Bot Behaviors */}
			<Card style={styles.card}>
				<Card.Content>
					<Text variant="titleMedium" style={{ marginBottom: 16 }}>
						Bot Behaviors
					</Text>

					{Object.entries(botConfig.behaviors).map(([behavior, enabled]) => (
						<View key={behavior} style={styles.behaviorRow}>
							<Text
								variant="bodyMedium"
								style={{ textTransform: "capitalize" }}
							>
								{behavior.replace(/([A-Z])/g, " $1").trim()}
							</Text>
							<Switch
								value={enabled}
								onValueChange={(value) =>
									setBotConfig({
										...botConfig,
										behaviors: { ...botConfig.behaviors, [behavior]: value },
									})
								}
							/>
						</View>
					))}

					<Text variant="bodySmall" style={styles.note}>
						Control what actions bots can take
					</Text>
				</Card.Content>
			</Card>

			{/* Controls */}
			<Card style={styles.card}>
				<Card.Content>
					<Text variant="titleMedium" style={{ marginBottom: 16 }}>
						Controls
					</Text>

					<View style={styles.buttonRow}>
						{!isRunning ? (
							<Button
								mode="contained"
								onPress={startBots}
								style={styles.primaryButton}
								disabled={!currentLocation || botConfig.count === 0}
							>
								Start Bots
							</Button>
						) : (
							<Button
								mode="contained-tonal"
								onPress={stopBots}
								style={styles.button}
							>
								Stop All Bots
							</Button>
						)}

						<Button
							mode="outlined"
							onPress={async () => {
								try {
									console.log("=== MANUAL BOT ACTIVITY TEST ===");
									await UserSimulatorService.triggerActivityBurst();
									Alert.alert(
										"Activity Triggered",
										"Forced bot activity - check console and rooms"
									);
								} catch (error) {
									console.error("Error triggering activity:", error);
									Alert.alert("Error", "Failed to trigger activity");
								}
							}}
							style={styles.button}
							disabled={botStats.activeBots === 0}
						>
							Force Bot Activity
						</Button>
					</View>

					<View style={styles.buttonRow}>
						<Button
							mode="outlined"
							onPress={async () => {
								console.log("=== DEBUG INFO ===");
								console.log(
									"Active simulations:",
									UserSimulatorService.getActiveSimulations()
								);
								console.log("Bot stats:", botStats);
								console.log("Is running:", isRunning);
								console.log("Active sim ID:", activeSimId);

								// Check if bots exist in database
								const { data: bots } = await supabase
									.from("users")
									.select("*")
									.eq("is_simulated", true);
								console.log("Bots in database:", bots?.length || 0);
								bots?.forEach((bot) =>
									console.log(`- ${bot.display_name} (${bot.id})`)
								);

								Alert.alert(
									"Debug Info",
									`Check console for details.\nBots in DB: ${bots?.length || 0}`
								);
							}}
							style={styles.button}
						>
							Debug Info
						</Button>

						<Button
							mode="outlined"
							onPress={resetToDefaults}
							style={styles.button}
						>
							Reset Defaults
						</Button>
					</View>

					<Divider style={{ marginVertical: 16 }} />

					<Button
						mode="text"
						onPress={() => {
							Alert.alert(
								"Clear All Bot Data",
								"Remove all bot users and their messages?",
								[
									{ text: "Cancel" },
									{
										text: "Clear All",
										style: "destructive",
										onPress: async () => {
											try {
												UserSimulatorService.getActiveSimulations().forEach(
													UserSimulatorService.stopSimulation
												);
												await supabase
													.from("users")
													.delete()
													.eq("is_simulated", true);
												setIsRunning(false);
												setActiveSimId(null);
												Alert.alert("Cleared", "All bot data removed");
											} catch (error) {
												Alert.alert("Error", "Failed to clear bot data");
											}
										},
									},
								]
							);
						}}
						textColor={theme.colors.error}
					>
						Clear All Bot Data
					</Button>
				</Card.Content>
			</Card>

			{/* Location Info */}
			{currentLocation && (
				<Card style={styles.card}>
					<Card.Content>
						<Text variant="titleMedium" style={{ marginBottom: 8 }}>
							Your Location
						</Text>
						<Text variant="bodySmall" style={{ color: theme.colors.outline }}>
							Lat: {currentLocation.coords.latitude.toFixed(4)}
						</Text>
						<Text variant="bodySmall" style={{ color: theme.colors.outline }}>
							Lng: {currentLocation.coords.longitude.toFixed(4)}
						</Text>
						<Text
							variant="bodySmall"
							style={{ marginTop: 4, color: theme.colors.outline }}
						>
							Simulated users will appear within {botConfig.locationSpread}km of
							this location
						</Text>
					</Card.Content>
				</Card>
			)}

			{/* How It Works */}
			<Card style={styles.card}>
				<Card.Content>
					<Text variant="titleMedium" style={{ marginBottom: 8 }}>
						How It Works
					</Text>
					<Text variant="bodySmall" style={styles.infoText}>
						• Bots appear as real users on the map and in rooms{"\n"}• They send
						contextual messages based on personality{"\n"}• Response to your
						messages naturally{"\n"}• Send and respond to prayer requests{"\n"}•
						Join/leave rooms organically{"\n"}• Perfect for testing app features
					</Text>
				</Card.Content>
			</Card>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
	},
	header: {
		padding: 16,
		marginBottom: 16,
		borderRadius: 12,
	},
	title: {
		marginBottom: 4,
	},
	subtitle: {
		opacity: 0.7,
	},
	card: {
		marginBottom: 16,
		borderRadius: 12,
	},
	statusRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	statsGrid: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	statItem: {
		alignItems: "center",
		flex: 1,
	},
	statNumber: {
		fontWeight: "bold",
		marginBottom: 2,
	},
	statLabel: {
		opacity: 0.6,
		textAlign: "center",
		fontSize: 11,
	},
	configRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 16,
	},
	configItem: {
		flex: 1,
		marginHorizontal: 4,
	},
	input: {
		marginTop: 4,
		height: 40,
	},
	inputLabel: {
		marginTop: 2,
		textAlign: "center",
		opacity: 0.6,
	},
	personalityRow: {
		marginBottom: 16,
	},
	personalityHeader: {
		marginBottom: 8,
	},
	sliderContainer: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	sliderButton: {
		minWidth: 40,
		height: 32,
	},
	sliderTrack: {
		flex: 1,
		height: 6,
		backgroundColor: "#E0E0E0",
		borderRadius: 3,
		overflow: "hidden",
	},
	sliderFill: {
		height: "100%",
		backgroundColor: "#2196F3",
		borderRadius: 3,
	},
	behaviorRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	buttonRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 8,
	},
	button: {
		flex: 1,
		marginHorizontal: 4,
	},
	primaryButton: {
		flex: 1,
		marginHorizontal: 4,
	},
	note: {
		opacity: 0.6,
		textAlign: "center",
		marginTop: 8,
		fontStyle: "italic",
	},
	infoText: {
		lineHeight: 18,
		opacity: 0.8,
	},
});
