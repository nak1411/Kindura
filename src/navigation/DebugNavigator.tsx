// src/navigation/DebugNavigator.tsx
import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import DebugScreen from "../screens/debug/DebugScreen";
import SimulationScreen from "../screens/debug/SimulationScreen";

export type DebugStackParamList = {
	DebugHome: undefined;
	Simulation: undefined;
};

const Stack = createStackNavigator<DebugStackParamList>();

export default function DebugNavigator() {
	return (
		<Stack.Navigator
			screenOptions={{
				headerShown: false,
				gestureEnabled: true,
			}}
		>
			<Stack.Screen
				name="DebugHome"
				component={DebugScreen}
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="Simulation"
				component={SimulationScreen}
				options={{
					headerShown: false,
				}}
			/>
		</Stack.Navigator>
	);
}
