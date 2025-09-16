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
	Portal,
	Modal,
	Surface,
	FAB,
} from "react-native-paper";
import { supabase } from "../../services/supabase";
import { useTheme } from "../../constants/theme-context";

type Quest = {
	id: string;
	title: string;
	description: string;
	duration_minutes: number;
	max_participants: number;
	mode: "video" | "audio" | "text" | "silent";
	faith_content: boolean;
	template: {
		warmup?: string;
		prompts: string[];
	};
};

export default function QuestFeedScreen() {
	const [quests, setQuests] = useState<Quest[]>([]);
	const [refreshing, setRefreshing] = useState(false);
	const [modalVisible, setModalVisible] = useState(false);
	const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
	const { theme } = useTheme();

	useEffect(() => {
		loadQuests();
	}, []);

	const loadQuests = async () => {
		// Mock data for now
		const mockQuests: Quest[] = [
			{
				id: "1",
				title: "Gentle Morning Reflection",
				description: "Share your intentions for the day with a caring soul",
				duration_minutes: 15,
				max_participants: 2,
				mode: "audio",
				faith_content: false,
				template: {
					warmup: "Take three deep breaths together",
					prompts: [
						"What are you feeling grateful for this morning?",
						"What's one intention you'd like to set for today?",
					],
				},
			},
			{
				id: "2",
				title: "Creative Expression Session",
				description:
					"Work on creative projects while keeping each other company",
				duration_minutes: 45,
				max_participants: 4,
				mode: "video",
				faith_content: false,
				template: {
					prompts: [
						"Share what you're working on",
						"Encourage each other's creativity",
					],
				},
			},
			{
				id: "3",
				title: "Peaceful Prayer Circle",
				description: "Join in quiet prayer and meditation together",
				duration_minutes: 20,
				max_participants: 6,
				mode: "silent",
				faith_content: true,
				template: {
					warmup: "Begin with a moment of silence",
					prompts: [
						"Share a prayer request if you feel comfortable",
						"End with gratitude",
					],
				},
			},
		];

		setQuests(mockQuests);
	};

	const onRefresh = async () => {
		setRefreshing(true);
		await loadQuests();
		setRefreshing(false);
	};

	const openQuestDetails = (quest: Quest) => {
		setSelectedQuest(quest);
		setModalVisible(true);
	};

	const joinQuest = (quest: Quest) => {
		setModalVisible(false);
		Alert.alert(
			"Joining Quest",
			`You're now looking for someone to join "${quest.title}" with you. We'll notify you when someone is interested!`,
			[{ text: "Great!" }]
		);
	};

	const getModeIcon = (mode: string) => {
		switch (mode) {
			case "video":
				return "📹";
			case "audio":
				return "🎙️";
			case "text":
				return "💬";
			case "silent":
				return "🤫";
			default:
				return "✨";
		}
	};

	const renderQuest = ({ item }: { item: Quest }) => (
		<Card
			style={[styles.questCard, { backgroundColor: theme.colors.surface }]}
			onPress={() => openQuestDetails(item)}
		>
			<Card.Content>
				<View style={styles.questHeader}>
					<Text
						variant="titleLarge"
						style={[styles.questTitle, { color: theme.colors.onSurface }]}
					>
						{item.title}
					</Text>
					<Text variant="labelSmall" style={{ color: theme.colors.outline }}>
						{item.duration_minutes}min
					</Text>
				</View>

				<Text
					variant="bodyMedium"
					style={[
						styles.questDescription,
						{ color: theme.colors.onSurfaceVariant },
					]}
				>
					{item.description}
				</Text>

				<View style={styles.questFooter}>
					<Chip
						mode="outlined"
						compact
						icon={
							item.mode === "audio"
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
		},
		questDescription: {
			marginBottom: theme.spacing.md,
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
			backgroundColor: theme.colors.surface,
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
			color: theme.colors.onSurface,
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
								<Text
									variant="titleSmall"
									style={{ color: theme.colors.onSurface }}
								>
									What to expect:
								</Text>
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
					Alert.alert("Coming Soon", "Quest creation will be available soon!");
				}}
			/>
		</View>
	);
}
