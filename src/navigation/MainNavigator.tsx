// src/navigation/MainNavigator.tsx - Updated without Profile tab
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DashboardScreen from "../screens/dashboard/DashboardScreen";
import RoomsNavigator from "./RoomsNavigator";
import PrayerPartnersNavigator from "./PrayerPartnersNavigator";
import MapScreen from "../screens/map/MapScreen";
import DebugScreen from "../screens/debug/DebugScreen";
import { useTheme } from "../constants/theme-context";

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
	const { theme } = useTheme();

	return (
		<Tab.Navigator
			initialRouteName="Dashboard"
			screenOptions={({ route }) => ({
				tabBarIcon: ({ focused, color, size }) => {
					let iconName: string = "circle";

					if (route.name === "Dashboard") {
						iconName = focused ? "view-dashboard" : "view-dashboard-outline";
					} else if (route.name === "Rooms") {
						iconName = focused ? "account-group" : "account-group-outline";
					} else if (route.name === "Prayer") {
						iconName = focused ? "hands-pray" : "hands-pray";
					} else if (route.name === "Map") {
						iconName = focused ? "map-marker" : "map-marker-outline";
					} else if (route.name === "Debug") {
						iconName = focused ? "bug" : "bug-outline";
					}

					return (
						<MaterialCommunityIcons
							name={iconName as any}
							size={size}
							color={color}
						/>
					);
				},
				tabBarActiveTintColor: theme.colors.primary,
				tabBarInactiveTintColor: theme.colors.outline,
				tabBarStyle: {
					backgroundColor: theme.colors.surface,
					borderTopColor: theme.colors.outline,
				},
				headerShown: false, // Let individual navigators handle their own headers
			})}
		>
			<Tab.Screen name="Dashboard" component={DashboardScreen} />
			<Tab.Screen name="Rooms" component={RoomsNavigator} />
			<Tab.Screen
				name="Prayer"
				component={PrayerPartnersNavigator}
				options={{ tabBarLabel: "Prayer Partners" }}
			/>
			<Tab.Screen name="Map" component={MapScreen} />
			{__DEV__ && <Tab.Screen name="Debug" component={DebugScreen} />}
		</Tab.Navigator>
	);
}
