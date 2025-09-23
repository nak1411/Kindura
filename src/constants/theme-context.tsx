import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightTheme, darkTheme } from "./theme";

type ThemeContextType = {
	isDark: boolean;
	theme: typeof lightTheme;
	toggleTheme: () => void;
	setTheme: (isDark: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@kindura_theme_preference";

type ThemeProviderProps = {
	children: ReactNode;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
	const [isDark, setIsDark] = useState(true); // Default to dark theme
	const [isLoading, setIsLoading] = useState(true);

	// Load theme preference on app start
	useEffect(() => {
		const loadThemePreference = async () => {
			try {
				const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
				if (savedTheme !== null) {
					setIsDark(JSON.parse(savedTheme));
				} else {
					// Default to dark theme if no saved preference
					setIsDark(true);
				}
			} catch (error) {
				console.error("Error loading theme preference:", error);
				setIsDark(true); // Default to dark on error
			} finally {
				setIsLoading(false);
			}
		};

		loadThemePreference();
	}, []);

	// Save theme preference when it changes
	useEffect(() => {
		if (!isLoading) {
			const saveThemePreference = async () => {
				try {
					await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(isDark));
				} catch (error) {
					console.error("Error saving theme preference:", error);
				}
			};

			saveThemePreference();
		}
	}, [isDark, isLoading]);

	const toggleTheme = () => {
		setIsDark(!isDark);
	};

	const setTheme = (darkMode: boolean) => {
		setIsDark(darkMode);
	};

	const currentTheme = isDark ? darkTheme : lightTheme;

	const value: ThemeContextType = {
		isDark,
		theme: currentTheme,
		toggleTheme,
		setTheme,
	};

	// Don't render children until theme is loaded
	if (isLoading) {
		return null; // You might want to return a loading screen here
	}

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
};

export const useTheme = (): ThemeContextType => {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
};
