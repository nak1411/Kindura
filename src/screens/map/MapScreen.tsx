import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Card, Button } from "react-native-paper";
import { useTheme } from "../../constants/theme-context";

export default function MapScreen() {
	const { theme } = useTheme();

	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.colors.background,
			padding: theme.spacing.md,
			justifyContent: "center",
			alignItems: "center",
		},
		card: {
			backgroundColor: theme.colors.surface,
			width: "100%",
			maxWidth: 400,
			borderRadius: 8,
		},
		title: {
			color: theme.colors.primary,
			textAlign: "center",
			marginBottom: theme.spacing.md,
		},
		description: {
			color: theme.colors.onSurface,
			textAlign: "center",
			marginBottom: theme.spacing.lg,
			lineHeight: 24,
		},
		comingSoonText: {
			color: theme.colors.outline,
			textAlign: "center",
			fontStyle: "italic",
		},
	});

	return (
		<View style={styles.container}>
			<Card style={styles.card}>
				<Card.Content>
					<Text variant="headlineMedium" style={styles.title}>
						🗺️ Connections Map
					</Text>

					<Text variant="bodyLarge" style={styles.description}>
						Discover nearby users and places in your community.
					</Text>

					<Text variant="bodyMedium" style={styles.comingSoonText}>
						Coming soon! This feature will help you find:
					</Text>

					<View style={{ marginVertical: theme.spacing.md }}>
						<Text
							variant="bodySmall"
							style={{ color: theme.colors.onSurface, marginBottom: 8 }}
						>
							• Other Kindura users nearby
						</Text>
						<Text
							variant="bodySmall"
							style={{ color: theme.colors.onSurface, marginBottom: 8 }}
						>
							• Peaceful places for reflection
						</Text>
						<Text
							variant="bodySmall"
							style={{ color: theme.colors.onSurface, marginBottom: 8 }}
						>
							• Community gathering spots
						</Text>
						<Text
							variant="bodySmall"
							style={{ color: theme.colors.onSurface, marginBottom: 8 }}
						>
							• Faith-based locations (if enabled)
						</Text>
					</View>

					<Button
						mode="outlined"
						onPress={() => {}}
						disabled
						style={{ marginTop: theme.spacing.md, borderRadius: 8 }}
					>
						Coming Soon
					</Button>
				</Card.Content>
			</Card>
		</View>
	);
}
