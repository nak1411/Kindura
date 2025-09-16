import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import RoomsScreen from "../screens/rooms/RoomsScreen";
import RoomDetailScreen from "../screens/rooms/RoomDetailScreen";

export type RoomsStackParamList = {
	RoomsList: undefined;
	RoomDetail: {
		roomId: string;
	};
};

const Stack = createStackNavigator<RoomsStackParamList>();

export default function RoomsNavigator() {
	return (
		<Stack.Navigator
			screenOptions={{
				headerShown: false, // Both screens handle their own headers
				gestureEnabled: true,
			}}
		>
			<Stack.Screen
				name="RoomsList"
				component={RoomsScreen}
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="RoomDetail"
				component={RoomDetailScreen}
				options={{
					headerShown: false,
					presentation: "modal", // Makes it feel more immersive
					cardStyleInterpolator: ({ current, layouts }) => {
						return {
							cardStyle: {
								transform: [
									{
										translateY: current.progress.interpolate({
											inputRange: [0, 1],
											outputRange: [layouts.screen.height, 0],
										}),
									},
								],
							},
							overlayStyle: {
								opacity: current.progress.interpolate({
									inputRange: [0, 1],
									outputRange: [0, 0.5],
								}),
							},
						};
					},
				}}
			/>
		</Stack.Navigator>
	);
}
