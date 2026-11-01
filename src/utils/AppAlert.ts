import { Alert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export const AppAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      if (buttons.length > 1) {
        // Find a cancel button and a primary action button
        const cancelBtn = buttons.find(b => b.style === 'cancel') ?? buttons[0];
        const actionBtn = buttons.find(b => b !== cancelBtn) ?? buttons[1];

        const confirmed = window.confirm(`${title}\n\n${message || ''}`);
        if (confirmed) {
          actionBtn.onPress?.();
        } else {
          cancelBtn.onPress?.();
        }
      } else {
        // Single OK button
        window.alert(`${title}\n\n${message || ''}`);
        buttons[0].onPress?.();
      }
    } else {
      // No buttons provided, just a standard alert
      window.alert(`${title}\n\n${message || ''}`);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};
