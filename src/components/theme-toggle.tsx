import React from "react";
import { View, StyleSheet } from "react-native";
import { Switch, Text, List } from "react-native-paper";
import { useTheme } from "../constants/theme-context";

type ThemeToggleProps = {
	showLabel?: boolean;
	style?: any;
};

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
	showLabel = true,
	style,
}) => {
	const { isDark, toggleTheme, theme } = useTheme();

	if (showLabel) {
		return (
			<List.Item
				title="Dark Mode"
				description="Switch between light and dark themes"
				left={(props) => (
					<List.Icon
						{...props}
						icon={isDark ? "weather-night" : "weather-sunny"}
					/>
				)}
				right={() => (
					<Switch
						value={isDark}
						onValueChange={toggleTheme}
						color={theme.colors.primary}
					/>
				)}
				style={[styles.listItem, style]}
			/>
		);
	}

	return (
		<View style={[styles.toggleContainer, style]}>
			<Text style={[styles.toggleLabel, { color: theme.colors.onSurface }]}>
				{isDark ? "Dark" : "Light"} Mode
			</Text>
			<Switch
				value={isDark}
				onValueChange={toggleTheme}
				color={theme.colors.primary}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	listItem: {
		paddingHorizontal: 16,
	},
	toggleContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	toggleLabel: {
		fontSize: 16,
		fontWeight: "500",
	},
});
