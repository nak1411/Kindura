import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import QuestFeedScreen from "../screens/quests/QuestFeedScreen";
import RoomsNavigator from "./RoomsNavigator";
import MapScreen from "../screens/map/MapScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import DebugScreen from "../screens/debug/DebugScreen";

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
	return (
		<Tab.Navigator
			screenOptions={({ route }) => ({
				tabBarIcon: ({ focused, color, size }) => {
					let iconName: string;

					if (route.name === "Quests") {
						iconName = focused ? "compass" : "compass-outline";
					} else if (route.name === "Rooms") {
						iconName = focused ? "account-group" : "account-group-outline";
					} else if (route.name === "Map") {
						iconName = focused ? "map-marker" : "map-marker-outline";
					} else if (route.name === "Debug") {
						iconName = focused ? "bug" : "bug-outline";
					} else {
						iconName = focused ? "account-circle" : "account-circle-outline";
					}

					return (
						<MaterialCommunityIcons
							name={iconName as any}
							size={size}
							color={color}
						/>
					);
				},
				tabBarActiveTintColor: "#6B73FF",
				tabBarInactiveTintColor: "gray",
				headerShown: false, // Let individual navigators handle their own headers
			})}
		>
			<Tab.Screen name="Quests" component={QuestFeedScreen} />
			<Tab.Screen name="Rooms" component={RoomsNavigator} />
			<Tab.Screen name="Map" component={MapScreen} />
			<Tab.Screen name="Profile" component={ProfileScreen} />
			{__DEV__ && <Tab.Screen name="Debug" component={DebugScreen} />}
		</Tab.Navigator>
	);
}
