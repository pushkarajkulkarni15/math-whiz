import { Platform } from 'react-native';

const primaryLight = '#1e6dff';
const primaryDark = '#5b87ff';
const primaryMutedLight = '#e5edff';
const primaryMutedDark = '#1f2a44';

export const Colors = {
  light: {
    text: '#0f172a',
    textMuted: '#6b7280',
    background: '#f6f8fc',
    card: '#ffffff',
    border: '#e5e7eb',
    inputBackground: '#f7f9fc',
    tint: primaryLight,
    icon: '#94a3b8',
    tabIconDefault: '#cbd5e1',
    tabIconSelected: primaryLight,
    primary: primaryLight,
    primaryDark: '#0f5edb',
    primaryMuted: primaryMutedLight,
    accent: '#12b76a',
    danger: '#ef4444',
    shadow: 'rgba(15, 23, 42, 0.08)',
  },
  dark: {
    text: '#e5e7eb',
    textMuted: '#9ca3af',
    background: '#0b1222',
    card: '#111827',
    border: '#1f2937',
    inputBackground: '#0f172a',
    tint: primaryDark,
    icon: '#9ca3af',
    tabIconDefault: '#6b7280',
    tabIconSelected: primaryDark,
    primary: primaryDark,
    primaryDark: '#4a7cff',
    primaryMuted: primaryMutedDark,
    accent: '#22c55e',
    danger: '#f87171',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
