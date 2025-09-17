// src/components/LocationPrivacyModal.tsx
import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import {
	Portal,
	Modal,
	Surface,
	Text,
	Button,
	Divider,
	List,
} from "react-native-paper";
import { useTheme } from "../constants/theme-context";

interface LocationPrivacyModalProps {
	visible: boolean;
	onDismiss: () => void;
}

export default function LocationPrivacyModal({
	visible,
	onDismiss,
}: LocationPrivacyModalProps) {
	const { theme } = useTheme();

	const styles = StyleSheet.create({
		modalContent: {
			backgroundColor: theme.colors.surface,
			padding: 20,
			margin: 20,
			borderRadius: 12,
			maxHeight: "80%",
		},
		section: {
			marginVertical: 8,
		},
		listItem: {
			paddingHorizontal: 0,
		},
	});

	return (
		<Portal>
			<Modal
				visible={visible}
				onDismiss={onDismiss}
				contentContainerStyle={styles.modalContent}
			>
				<ScrollView showsVerticalScrollIndicator={false}>
					<Text
						variant="headlineSmall"
						style={{ marginBottom: 16, textAlign: "center" }}
					>
						🔒 Location Privacy & Safety
					</Text>

					<Text
						variant="bodyMedium"
						style={[styles.section, { color: theme.colors.outline }]}
					>
						At Kindura, your privacy and safety are our top priorities. Here's
						exactly how we handle your location data:
					</Text>

					<Divider style={{ marginVertical: 16 }} />

					{/* Privacy Protection Section */}
					<Text variant="titleMedium" style={{ marginBottom: 8 }}>
						Privacy Protection
					</Text>

					<List.Item
						title="No Exact Locations"
						description="Your precise coordinates are never stored or shared. We only use general areas."
						left={(props) => <List.Icon {...props} icon="map-marker-off" />}
						style={styles.listItem}
					/>

					<List.Item
						title="1km Privacy Radius"
						description="Your location is rounded to approximately 1 kilometer accuracy for privacy."
						left={(props) => <List.Icon {...props} icon="shield-check" />}
						style={styles.listItem}
					/>

					<List.Item
						title="Anonymous Display"
						description="You appear as 'Kindura User' to others - no profile info is shared on the map."
						left={(props) => <List.Icon {...props} icon="incognito" />}
						style={styles.listItem}
					/>

					<Divider style={{ marginVertical: 16 }} />

					{/* Data Handling Section */}
					<Text variant="titleMedium" style={{ marginBottom: 8 }}>
						How We Handle Your Data
					</Text>

					<List.Item
						title="Limited Storage"
						description="Only your general area and last active time are stored - no location history."
						left={(props) => <List.Icon {...props} icon="database-remove" />}
						style={styles.listItem}
					/>

					<List.Item
						title="Recent Activity Only"
						description="Only users active in the last 24 hours appear on the map."
						left={(props) => <List.Icon {...props} icon="clock-outline" />}
						style={styles.listItem}
					/>

					<List.Item
						title="Auto-Cleanup"
						description="Your location data is automatically removed when you go offline or disable sharing."
						left={(props) => <List.Icon {...props} icon="auto-fix" />}
						style={styles.listItem}
					/>

					<Divider style={{ marginVertical: 16 }} />

					{/* Safety Features Section */}
					<Text variant="titleMedium" style={{ marginBottom: 8 }}>
						Safety Features
					</Text>

					<List.Item
						title="Opt-In Only"
						description="Location sharing is completely optional and disabled by default."
						left={(props) => <List.Icon {...props} icon="hand-okay" />}
						style={styles.listItem}
					/>

					<List.Item
						title="Instant Control"
						description="Turn location sharing on or off instantly from your profile or map settings."
						left={(props) => <List.Icon {...props} icon="toggle-switch" />}
						style={styles.listItem}
					/>

					<List.Item
						title="No Tracking"
						description="We don't track your movements or create location histories."
						left={(props) => (
							<List.Icon {...props} icon="map-marker-radius-outline" />
						)}
						style={styles.listItem}
					/>

					<Divider style={{ marginVertical: 16 }} />

					{/* What You Control Section */}
					<Text variant="titleMedium" style={{ marginBottom: 8 }}>
						What You Control
					</Text>

					<Text
						variant="bodyMedium"
						style={[styles.section, { color: theme.colors.onSurface }]}
					>
						• <Text style={{ fontWeight: "600" }}>When to share:</Text>{" "}
						Enable/disable anytime{"\n"}•{" "}
						<Text style={{ fontWeight: "600" }}>Who can see:</Text> Only other
						Kindura users with sharing enabled{"\n"}•{" "}
						<Text style={{ fontWeight: "600" }}>What they see:</Text> General
						area only, no personal details{"\n"}•{" "}
						<Text style={{ fontWeight: "600" }}>How long:</Text> Data is cleared
						when you go offline
					</Text>

					<Divider style={{ marginVertical: 16 }} />

					{/* Technical Details Section */}
					<Text variant="titleMedium" style={{ marginBottom: 8 }}>
						Technical Details
					</Text>

					<Text
						variant="bodyMedium"
						style={[styles.section, { color: theme.colors.outline }]}
					>
						• Location updates every 15 minutes when active{"\n"}• 10km maximum
						search radius{"\n"}• Coordinates rounded to 2 decimal places (~1.1km
						accuracy){"\n"}• Encrypted data transmission and storage{"\n"}• No
						third-party location services used
					</Text>

					<Divider style={{ marginVertical: 16 }} />

					{/* Contact Section */}
					<Text
						variant="bodySmall"
						style={[
							styles.section,
							{ color: theme.colors.outline, textAlign: "center" },
						]}
					>
						Questions about privacy? Contact us at privacy@kindura.app
					</Text>

					<Button
						mode="contained"
						onPress={onDismiss}
						style={{ marginTop: 16, borderRadius: 8 }}
					>
						Got It
					</Button>
				</ScrollView>
			</Modal>
		</Portal>
	);
}
