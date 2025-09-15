import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6B73FF', // Gentle purple
    secondary: '#9C88FF', // Lighter purple
    tertiary: '#FFB4BA', // Soft pink
    surface: '#FAFAFA',
    background: '#FFFFFF',
    accent: '#4ECDC4', // Calm teal
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};