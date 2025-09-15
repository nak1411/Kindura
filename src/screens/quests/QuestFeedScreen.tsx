import React, { useState, useEffect } from "react";
import {
	View,
	StyleSheet,
	FlatList,
	RefreshControl,
	Alert,
} from "react-native";
import {
	Text,
	Card,
	Button,
	Chip,
	FAB,
	Portal,
	Modal,
	Surface,
} from "react-native-paper";
import { supabase } from "../../services/supabase";
import { theme } from "../../constants/theme";
import { Quest, User } from "../../types";

export default function QuestFeedScreen({ navigation }: any) {
	const [quests, setQuests] = useState<Quest[]>([]);
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
	const [modalVisible, setModalVisible] = useState(false);

	useEffect(() => {
		loadUser();
		loadQuests();
	}, []);

	const loadUser = async () => {
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
	};

	const loadQuests = async () => {
		setLoading(true);
		try {
			let query = supabase.from("quests").select("*").eq("is_active", true);

			// Filter by faith mode if user has it disabled
			if (user && !user.faith_mode) {
				query = query.eq("faith_content", false);
			}

			const { data, error } = await query.order("created_at", {
				ascending: false,
			});

			if (error) throw error;
			setQuests(data || []);
		} catch (error) {
			console.error("Error loading quests:", error);
			Alert.alert("Error", "Failed to load quests");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	const onRefresh = () => {
		setRefreshing(true);
		loadQuests();
	};

	const joinQuest = async (quest: Quest) => {
		if (!user) return;

		try {
			const { data, error } = await supabase
				.from("quest_sessions")
				.insert({
					quest_id: quest.id,
					host_id: user.id,
					participants: [user.id],
					status: "waiting",
					scheduled_for: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes from now
				})
				.select()
				.single();

			if (error) throw error;

			Alert.alert(
				"Quest Joined!",
				"You'll be matched with someone soon. We'll notify you when it's time to begin.",
				[{ text: "OK", onPress: () => setModalVisible(false) }]
			);
		} catch (error) {
			console.error("Error joining quest:", error);
			Alert.alert("Error", "Failed to join quest");
		}
	};

	const openQuestModal = (quest: Quest) => {
		setSelectedQuest(quest);
		setModalVisible(true);
	};

	const getModeIcon = (mode: string) => {
		switch (mode) {
			case "voice":
				return "🎙️";
			case "video":
				return "📹";
			case "text":
				return "💬";
			case "quiet":
				return "🤫";
			default:
				return "✨";
		}
	};

	const renderQuest = ({ item }: { item: Quest }) => (
		<Card style={styles.questCard} onPress={() => openQuestModal(item)}>
			<Card.Content>
				<View style={styles.questHeader}>
					<Text variant="titleMedium" style={styles.questTitle}>
						{getModeIcon(item.mode)} {item.title}
					</Text>
					<Chip compact>{item.duration_minutes}min</Chip>
				</View>

				<Text variant="bodyMedium" style={styles.questDescription}>
					{item.description}
				</Text>

				<View style={styles.questFooter}>
					<Chip
						mode="outlined"
						compact
						icon={
							item.mode === "voice"
								? "microphone"
								: item.mode === "video"
								? "video"
								: item.mode === "text"
								? "message"
								: "volume-off"
						}
					>
						{item.mode}
					</Chip>
					{item.faith_content && (
						<Chip mode="outlined" compact icon="heart">
							Faith
						</Chip>
					)}
				</View>
			</Card.Content>
		</Card>
	);

	return (
		<View style={styles.container}>
			<Text variant="headlineMedium" style={styles.header}>
				Available Quests
			</Text>
			<Text variant="bodyMedium" style={styles.subheader}>
				Choose a gentle adventure to share with someone
			</Text>

			<FlatList
				data={quests}
				renderItem={renderQuest}
				keyExtractor={(item) => item.id}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.listContent}
			/>

			<Portal>
				<Modal
					visible={modalVisible}
					onDismiss={() => setModalVisible(false)}
					contentContainerStyle={styles.modal}
				>
					{selectedQuest && (
						<Surface style={styles.modalContent}>
							<Text variant="headlineSmall" style={styles.modalTitle}>
								{getModeIcon(selectedQuest.mode)} {selectedQuest.title}
							</Text>

							<Text variant="bodyMedium" style={styles.modalDescription}>
								{selectedQuest.description}
							</Text>

							<View style={styles.questDetails}>
								<Text variant="titleSmall">What to expect:</Text>
								<Text variant="bodySmall" style={styles.detailText}>
									• Duration: {selectedQuest.duration_minutes} minutes
								</Text>
								<Text variant="bodySmall" style={styles.detailText}>
									• Mode: {selectedQuest.mode} interaction
								</Text>
								<Text variant="bodySmall" style={styles.detailText}>
									• Max participants: {selectedQuest.max_participants}
								</Text>
								{selectedQuest.template.warmup && (
									<Text variant="bodySmall" style={styles.detailText}>
										• Starts with: {selectedQuest.template.warmup}
									</Text>
								)}
							</View>

							<View style={styles.modalButtons}>
								<Button
									mode="outlined"
									onPress={() => setModalVisible(false)}
									style={styles.modalButton}
								>
									Maybe Later
								</Button>
								<Button
									mode="contained"
									onPress={() => joinQuest(selectedQuest)}
									style={styles.modalButton}
								>
									Join Quest
								</Button>
							</View>
						</Surface>
					)}
				</Modal>
			</Portal>

			<FAB
				icon="plus"
				style={styles.fab}
				onPress={() => {
					// TODO: Navigate to create quest screen
					Alert.alert("Coming Soon", "Quest creation will be available soon!");
				}}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
		padding: theme.spacing.md,
	},
	header: {
		color: theme.colors.primary,
		marginBottom: theme.spacing.xs,
		marginTop: theme.spacing.md,
	},
	subheader: {
		color: theme.colors.outline,
		marginBottom: theme.spacing.lg,
	},
	listContent: {
		paddingBottom: 80, // Space for FAB
	},
	questCard: {
		marginBottom: theme.spacing.md,
		elevation: 2,
	},
	questHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: theme.spacing.sm,
	},
	questTitle: {
		flex: 1,
		color: theme.colors.onSurface,
	},
	questDescription: {
		marginBottom: theme.spacing.md,
		color: theme.colors.onSurfaceVariant,
		lineHeight: 20,
	},
	questFooter: {
		flexDirection: "row",
		gap: theme.spacing.sm,
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
	modalDescription: {
		marginBottom: theme.spacing.lg,
		textAlign: "center",
		lineHeight: 22,
	},
	questDetails: {
		marginBottom: theme.spacing.lg,
	},
	detailText: {
		marginLeft: theme.spacing.sm,
		marginTop: theme.spacing.xs,
		color: theme.colors.onSurfaceVariant,
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
