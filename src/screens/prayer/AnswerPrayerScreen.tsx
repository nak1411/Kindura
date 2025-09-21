// src/screens/prayer/AnswerPrayerScreen.tsx
import React, { useState, useEffect } from "react";
import {
	View,
	StyleSheet,
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
} from "react-native-paper";
import { supabase } from "../../services/supabase";
import { useTheme } from "../../constants/theme-context";
import { PrayerRequest, User } from "../../types";
import { PrayerPartnerService } from "../../services/PrayerPartnerService";

interface AnswerPrayerScreenProps {
	route: {
		params: {
			requestId: string;
		};
	};
	navigation: any;
}

export default function AnswerPrayerScreen({
	route,
	navigation,
}: AnswerPrayerScreenProps) {
	const { requestId } = route.params;
	const { theme } = useTheme();

	// State
	const [user, setUser] = useState<User | null>(null);
	const [prayerRequest, setPrayerRequest] = useState<PrayerRequest | null>(
		null
	);
	const [loading, setLoading] = useState(true);
	const [answeredNote, setAnsweredNote] = useState("");
	const [marking, setMarking] = useState(false);

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
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

			// Load prayer request details
			const { data: request, error } = await supabase
				.from("prayer_requests")
				.select("*")
				.eq("id", requestId)
				.single();

			if (error) throw error;

			if (request) {
				// Get user data for from_user and to_user
				const { data: users, error: usersError } = await supabase
					.from("users")
					.select("id, display_name")
					.in("id", [request.from_user_id, request.to_user_id]);

				if (usersError) throw usersError;

				// Create user lookup map
				const userMap = new Map();
				users?.forEach((user) => {
					userMap.set(user.id, user);
				});

				// Add user data to request
				const requestWithUsers = {
					...request,
					from_user: userMap.get(request.from_user_id),
					to_user: userMap.get(request.to_user_id),
				};

				setPrayerRequest(requestWithUsers);
			}
		} catch (error) {
			console.error("Error loading prayer request:", error);
			Alert.alert("Error", "Failed to load prayer request");
			navigation.goBack();
		} finally {
			setLoading(false);
		}
	};

	const handleMarkAnswered = async () => {
		if (!prayerRequest) return;

		setMarking(true);
		try {
			await PrayerPartnerService.markPrayerAnswered(
				requestId,
				answeredNote.trim() || undefined
			);

			Alert.alert(
				"Prayer Answered! 🙏",
				"Thank you for sharing how God answered this prayer.",
				[
					{
						text: "OK",
						onPress: () => navigation.goBack(),
					},
				]
			);
		} catch (error) {
			Alert.alert("Error", "Failed to mark prayer as answered");
		} finally {
			setMarking(false);
		}
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
		title: {
			color: theme.colors.onSurface,
			flex: 1,
		},
		content: {
			flex: 1,
			padding: 16,
		},
		requestCard: {
			backgroundColor: theme.colors.surface,
			marginBottom: 16,
		},
		requestHeader: {
			flexDirection: "row",
			alignItems: "center",
			marginBottom: 12,
		},
		userInfo: {
			marginLeft: 12,
			flex: 1,
		},
		userName: {
			color: theme.colors.onSurface,
		},
		requestDate: {
			color: theme.colors.outline,
		},
		requestText: {
			color: theme.colors.onSurface,
			fontSize: 16,
			lineHeight: 24,
			marginBottom: 12,
		},
		urgentChip: {
			backgroundColor: theme.colors.errorContainer,
			color: theme.colors.error,
			alignSelf: "flex-start",
		},
		answerSection: {
			backgroundColor: theme.colors.surface,
			borderRadius: 8,
			padding: 16,
		},
		sectionTitle: {
			color: theme.colors.onSurface,
			marginBottom: 12,
		},
		input: {
			marginBottom: 16,
		},
		buttonContainer: {
			flexDirection: "row",
			gap: 8,
		},
		button: {
			flex: 1,
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
				<Text>Loading prayer request...</Text>
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
					<Text variant="headlineSmall" style={styles.title}>
						Mark Prayer as Answered
					</Text>
				</View>
			</Surface>

			<View style={styles.content}>
				{/* Prayer Request Card */}
				<Card style={styles.requestCard}>
					<Card.Content>
						<View style={styles.requestHeader}>
							<Avatar.Text
								size={48}
								label={
									prayerRequest?.from_user?.display_name
										?.charAt(0)
										.toUpperCase() || "?"
								}
								style={{ backgroundColor: theme.colors.primaryContainer }}
							/>
							<View style={styles.userInfo}>
								<Text variant="titleMedium" style={styles.userName}>
									{prayerRequest?.from_user?.display_name}
								</Text>
								<Text variant="bodySmall" style={styles.requestDate}>
									{prayerRequest &&
										new Date(prayerRequest.created_at).toLocaleDateString()}
								</Text>
							</View>
						</View>

						<Text variant="bodyLarge" style={styles.requestText}>
							{prayerRequest?.request_text}
						</Text>

						{prayerRequest?.is_urgent && (
							<Text variant="labelMedium" style={styles.urgentChip}>
								🚨 Urgent Request
							</Text>
						)}
					</Card.Content>
				</Card>

				{/* Answer Section */}
				<View style={styles.answerSection}>
					<Text variant="titleMedium" style={styles.sectionTitle}>
						How was this prayer answered?
					</Text>

					<TextInput
						label="Share how God answered this prayer (optional)"
						value={answeredNote}
						onChangeText={setAnsweredNote}
						mode="outlined"
						multiline
						numberOfLines={4}
						placeholder="God provided peace, opened a door, brought healing..."
						style={styles.input}
					/>

					<View style={styles.buttonContainer}>
						<Button
							mode="outlined"
							onPress={() => navigation.goBack()}
							style={styles.button}
						>
							Cancel
						</Button>
						<Button
							mode="contained"
							onPress={handleMarkAnswered}
							loading={marking}
							disabled={marking}
							style={styles.button}
							icon="check"
						>
							Mark as Answered
						</Button>
					</View>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}
