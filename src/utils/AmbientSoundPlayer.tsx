import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Animated, TouchableOpacity } from "react-native";
import { Text, Card, IconButton, Chip } from "react-native-paper";
import { theme } from "../constants/theme";

interface AmbientSoundPlayerProps {
	soundName?: string;
	isPlaying: boolean;
	onTogglePlay: () => void;
	onVolumeChange?: (volume: number) => void;
	style?: any;
}

interface SoundConfig {
	name: string;
	icon: string;
	description: string;
	color: string;
	waveform: number[];
}

const AMBIENT_SOUNDS: Record<string, SoundConfig> = {
	rain: {
		name: "Gentle Rain",
		icon: "weather-rainy",
		description: "Soft rainfall on leaves",
		color: "#4A90E2",
		waveform: [0.3, 0.7, 0.5, 0.8, 0.4, 0.6, 0.9, 0.2],
	},
	forest: {
		name: "Forest Ambience",
		icon: "tree",
		description: "Birds and rustling leaves",
		color: "#5CB85C",
		waveform: [0.2, 0.4, 0.7, 0.3, 0.6, 0.5, 0.8, 0.4],
	},
	ocean: {
		name: "Ocean Waves",
		icon: "waves",
		description: "Gentle waves on shore",
		color: "#5BC0DE",
		waveform: [0.1, 0.9, 0.3, 0.8, 0.2, 0.7, 0.4, 0.6],
	},
	cafe: {
		name: "Café Ambience",
		icon: "coffee",
		description: "Soft chatter and coffee",
		color: "#8B4513",
		waveform: [0.4, 0.3, 0.7, 0.5, 0.6, 0.4, 0.8, 0.3],
	},
	fireplace: {
		name: "Fireplace",
		icon: "fire",
		description: "Crackling wood fire",
		color: "#FF6B35",
		waveform: [0.6, 0.2, 0.8, 0.4, 0.7, 0.3, 0.9, 0.5],
	},
	quiet: {
		name: "Peaceful Quiet",
		icon: "volume-off",
		description: "Serene silence",
		color: "#9E9E9E",
		waveform: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
	},
};

export default function AmbientSoundPlayer({
	soundName = "quiet",
	isPlaying,
	onTogglePlay,
	onVolumeChange,
	style,
}: AmbientSoundPlayerProps) {
	const [volume, setVolume] = useState(0.7);
	const [showControls, setShowControls] = useState(false);

	const waveformAnimations = useRef(
		Array.from({ length: 8 }, () => new Animated.Value(0.1))
	).current;

	const pulseAnimation = useRef(new Animated.Value(1)).current;
	const soundConfig = AMBIENT_SOUNDS[soundName] || AMBIENT_SOUNDS.quiet;

	useEffect(() => {
		if (isPlaying && soundName !== "quiet") {
			startWaveformAnimation();
			startPulseAnimation();
		} else {
			stopAnimations();
		}

		return () => stopAnimations();
	}, [isPlaying, soundName]);

	const startWaveformAnimation = () => {
		const animateWave = () => {
			const animations = waveformAnimations.map((anim, index) => {
				const targetHeight =
					soundConfig.waveform[index] * (0.3 + Math.random() * 0.4);
				return Animated.timing(anim, {
					toValue: targetHeight,
					duration: 800 + Math.random() * 400,
					useNativeDriver: false,
				});
			});

			Animated.parallel(animations).start(() => {
				if (isPlaying) {
					setTimeout(animateWave, 200);
				}
			});
		};

		animateWave();
	};

	const startPulseAnimation = () => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnimation, {
					toValue: 1.1,
					duration: 2000,
					useNativeDriver: true,
				}),
				Animated.timing(pulseAnimation, {
					toValue: 1,
					duration: 2000,
					useNativeDriver: true,
				}),
			])
		).start();
	};

	const stopAnimations = () => {
		waveformAnimations.forEach((anim) => anim.stopAnimation());
		pulseAnimation.stopAnimation();
		pulseAnimation.setValue(1);
	};

	const handleVolumeChange = (newVolume: number) => {
		setVolume(newVolume);
		onVolumeChange?.(newVolume);
	};

	const handleTogglePlay = () => {
		onTogglePlay();
		// Add haptic feedback if available
		// Haptics.impact(Haptics.ImpactFeedbackStyle.Light);
	};

	return (
		<Card style={[styles.container, style]}>
			<Card.Content>
				<View style={styles.header}>
					<View style={styles.soundInfo}>
						<Animated.View
							style={[
								styles.iconContainer,
								{
									backgroundColor: soundConfig.color + "20",
									transform: [{ scale: pulseAnimation }],
								},
							]}
						>
							<IconButton
								icon={soundConfig.icon}
								size={24}
								iconColor={soundConfig.color}
								style={styles.soundIcon}
							/>
						</Animated.View>
						<View style={styles.soundDetails}>
							<Text variant="titleMedium" style={styles.soundName}>
								{soundConfig.name}
							</Text>
							<Text variant="bodySmall" style={styles.soundDescription}>
								{soundConfig.description}
							</Text>
						</View>
					</View>

					<View style={styles.controls}>
						<IconButton
							icon={isPlaying ? "pause" : "play"}
							mode="contained"
							size={20}
							onPress={handleTogglePlay}
							style={[
								styles.playButton,
								{ backgroundColor: soundConfig.color },
							]}
							iconColor="white"
						/>
						<IconButton
							icon={showControls ? "chevron-up" : "chevron-down"}
							size={16}
							onPress={() => setShowControls(!showControls)}
							style={styles.expandButton}
						/>
					</View>
				</View>

				{/* Waveform Visualization */}
				{soundName !== "quiet" && (
					<View style={styles.waveformContainer}>
						{waveformAnimations.map((anim, index) => (
							<Animated.View
								key={index}
								style={[
									styles.waveformBar,
									{
										height: anim.interpolate({
											inputRange: [0, 1],
											outputRange: [2, 30],
										}),
										backgroundColor: isPlaying
											? soundConfig.color
											: theme.colors.outline,
										opacity: isPlaying ? 0.8 : 0.3,
									},
								]}
							/>
						))}
					</View>
				)}

				{/* Status Indicator */}
				<View style={styles.statusContainer}>
					<Chip
						mode="outlined"
						compact
						style={[
							styles.statusChip,
							{
								borderColor: isPlaying
									? soundConfig.color
									: theme.colors.outline,
							},
						]}
						textStyle={{
							color: isPlaying ? soundConfig.color : theme.colors.outline,
						}}
					>
						{isPlaying ? "Playing" : "Paused"}
					</Chip>
				</View>

				{/* Extended Controls */}
				{showControls && soundName !== "quiet" && (
					<View style={styles.extendedControls}>
						<View style={styles.volumeControl}>
							<IconButton
								icon="volume-low"
								size={16}
								iconColor={theme.colors.outline}
							/>
							<TouchableOpacity
								style={styles.volumeSliderContainer}
								onPress={(evt) => {
									const { locationX } = evt.nativeEvent;
									const containerWidth = 200; // approximate width
									const newVolume = Math.max(
										0,
										Math.min(1, locationX / containerWidth)
									);
									handleVolumeChange(newVolume);
								}}
								activeOpacity={1}
							>
								<View style={styles.volumeTrack}>
									<View
										style={[
											styles.volumeProgress,
											{
												width: `${volume * 100}%`,
												backgroundColor: soundConfig.color,
											},
										]}
									/>
								</View>
								<View
									style={[
										styles.volumeThumb,
										{
											left: `${Math.max(0, Math.min(100, volume * 100))}%`,
											backgroundColor: soundConfig.color,
										},
									]}
								/>
							</TouchableOpacity>
							<IconButton
								icon="volume-high"
								size={16}
								iconColor={theme.colors.outline}
							/>
						</View>

						<View style={styles.quickActions}>
							<Chip
								mode="outlined"
								compact
								onPress={() => handleVolumeChange(0.3)}
								style={styles.presetChip}
							>
								Low
							</Chip>
							<Chip
								mode="outlined"
								compact
								onPress={() => handleVolumeChange(0.7)}
								style={styles.presetChip}
							>
								Medium
							</Chip>
							<Chip
								mode="outlined"
								compact
								onPress={() => handleVolumeChange(1.0)}
								style={styles.presetChip}
							>
								High
							</Chip>
						</View>
					</View>
				)}
			</Card.Content>
		</Card>
	);
}

const styles = StyleSheet.create({
	container: {
		marginVertical: 8,
		elevation: 2,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	soundInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	iconContainer: {
		borderRadius: 20,
		marginRight: 12,
	},
	soundIcon: {
		margin: 0,
	},
	soundDetails: {
		flex: 1,
	},
	soundName: {
		color: theme.colors.onSurface,
		fontWeight: "500",
	},
	soundDescription: {
		color: theme.colors.outline,
		marginTop: 2,
	},
	controls: {
		flexDirection: "row",
		alignItems: "center",
	},
	playButton: {
		marginRight: 4,
	},
	expandButton: {
		margin: 0,
	},
	waveformContainer: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "flex-end",
		height: 40,
		marginVertical: 12,
		gap: 3,
	},
	waveformBar: {
		width: 4,
		borderRadius: 2,
		minHeight: 2,
	},
	statusContainer: {
		alignItems: "center",
		marginVertical: 8,
	},
	statusChip: {
		backgroundColor: "transparent",
	},
	extendedControls: {
		marginTop: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: theme.colors.outline + "20",
	},
	volumeControl: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
	},
	volumeSliderContainer: {
		flex: 1,
		marginHorizontal: 8,
		height: 20,
		justifyContent: "center",
		position: "relative",
	},
	volumeTrack: {
		height: 4,
		backgroundColor: theme.colors.outline + "40",
		borderRadius: 2,
	},
	volumeProgress: {
		height: 4,
		borderRadius: 2,
	},
	volumeThumb: {
		position: "absolute",
		width: 16,
		height: 16,
		borderRadius: 8,
		marginLeft: -8,
		marginTop: -6,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
	},
	quickActions: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 8,
	},
	presetChip: {
		backgroundColor: "transparent",
	},
});

// Export commonly used ambient sounds for easy access
export const AVAILABLE_SOUNDS = Object.keys(AMBIENT_SOUNDS).map((key) => ({
	key,
	...AMBIENT_SOUNDS[key],
}));
