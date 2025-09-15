import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "../screens/auth/LoginScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";
import OnboardingScreen from "../screens/auth/OnboardingScreen";

const Stack = createStackNavigator();

export default function AuthNavigator() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false }}>
			<Stack.Screen name="Login" component={LoginScreen} />
			<Stack.Screen name="SignUp" component={SignUpScreen} />
			<Stack.Screen name="Onboarding" component={OnboardingScreen} />
		</Stack.Navigator>
	);
}
