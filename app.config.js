export default {
	expo: {
		name: "Kindura",
		slug: "kindura",
		version: "1.0.0",
		orientation: "portrait",
		icon: "./assets/icon.png",
		userInterfaceStyle: "light",
		splash: {
			image: "./assets/splash.png",
			resizeMode: "contain",
			backgroundColor: "#ffffff",
		},
		assetBundlePatterns: ["**/*"],
		extra: {
			eas: {
				projectId: "57cb7e45-363f-45f1-9ece-74ee2ff62bd2",
			},
		},
		ios: {
			supportsTablet: true,
			bundleIdentifier: "com.yourcompany.kindura",
		},
		android: {
			adaptiveIcon: {
				foregroundImage: "./assets/adaptive-icon.png",
				backgroundColor: "#ffffff",
			},
			package: "com.yourcompany.kindura",
			permissions: [
				"ACCESS_COARSE_LOCATION",
				"ACCESS_FINE_LOCATION",
				"CAMERA",
				"RECORD_AUDIO",
			],
			softwareKeyboard: {
				mode: "adjustResize",
				windowSoftInputMode: "adjustResize",
			},
		},
		web: {
			favicon: "./assets/favicon.png",
		},
		plugins: [
			"expo-font",
			[
				"expo-location",
				{
					locationAlwaysAndWhenInUsePermission:
						"Allow Kindura to use your location to find nearby services.",
				},
			],
			[
				"expo-av",
				{
					microphonePermission:
						"Allow Kindura to access your microphone for voice features.",
				},
			],
			["expo-notifications"],
		],
	},
};
