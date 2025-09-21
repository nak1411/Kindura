// src/navigation/PrayerPartnersNavigator.tsx
import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import PrayerPartnerScreen from "../screens/prayer/PrayerPartnerScreen";
import FindPrayerPartnerScreen from "../screens/prayer/FindPrayerPartnerScreen";
import PrayerPartnerDetailScreen from "../screens/prayer/PrayerPartnerDetailScreen";
import AnswerPrayerScreen from "../screens/prayer/AnswerPrayerScreen";
import AllPrayerRequestsScreen from "../screens/prayer/AllPrayerRequestsScreen";

export type PrayerPartnersStackParamList = {
	PrayerPartnersList: undefined;
	FindPrayerPartner: undefined;
	PrayerPartnerDetail: {
		partnershipId: string;
	};
	AnswerPrayer: {
		requestId: string;
	};
	AllPrayerRequests: undefined;
};

const Stack = createStackNavigator<PrayerPartnersStackParamList>();

export default function PrayerPartnersNavigator() {
	return (
		<Stack.Navigator
			screenOptions={{
				headerShown: false,
				gestureEnabled: true,
			}}
		>
			<Stack.Screen
				name="PrayerPartnersList"
				component={PrayerPartnerScreen}
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="FindPrayerPartner"
				component={FindPrayerPartnerScreen}
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="PrayerPartnerDetail"
				component={PrayerPartnerDetailScreen}
				options={{
					headerShown: false,
				}}
			/>
			<Stack.Screen
				name="AnswerPrayer"
				component={AnswerPrayerScreen}
				options={{
					headerShown: false,
					presentation: "modal",
				}}
			/>
			<Stack.Screen
				name="AllPrayerRequests"
				component={AllPrayerRequestsScreen}
				options={{
					headerShown: false,
				}}
			/>
		</Stack.Navigator>
	);
}
