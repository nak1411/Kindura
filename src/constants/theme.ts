import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6B73FF', // Gentle purple
    secondary: '#9C88FF', // Lighter purple
    tertiary: '#FFB4BA', // Soft pink
    surface: '#FAFAFA',
    background: '#FFFFFF',
    accent: '#4ECDC4', // Calm teal
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#1C1C1E',
    onBackground: '#1C1C1E',
    outline: '#8E8E93',
    onSurfaceVariant: '#6D6D6D',
    surfaceVariant: '#F2F2F7',
    primaryContainer: '#E8EAFF',
    onPrimaryContainer: '#1A1C2C',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#7B83FF', // Brighter gentle purple for dark mode
    secondary: '#AC98FF', // Brighter lighter purple
    tertiary: '#FFB4BA', // Soft pink (same)
    surface: '#1C1C1E',
    background: '#000000',
    accent: '#5EDDD4', // Brighter calm teal
    onPrimary: '#1A1C2C',
    onSecondary: '#1A1C2C',
    onSurface: '#FFFFFF',
    onBackground: '#FFFFFF',
    outline: '#8E8E93',
    onSurfaceVariant: '#AEAEB2',
    surfaceVariant: '#2C2C2E',
    primaryContainer: '#2A2D3A',
    onPrimaryContainer: '#E8EAFF',
    error: '#FF453A',
    onError: '#FFFFFF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

export { lightTheme, darkTheme };

// For backward compatibility, export the light theme as default
export const theme = lightTheme;