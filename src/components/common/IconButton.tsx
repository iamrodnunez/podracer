import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Text,
} from 'react-native';

interface IconButtonProps {
  icon: string;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}

const iconSizes = {
  small: 12,
  medium: 14,
  large: 18,
};

const containerSizes = {
  small: 32,
  medium: 40,
  large: 56,
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 'medium',
  variant = 'ghost',
  disabled = false,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: containerSizes[size], height: containerSizes[size] },
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.icon,
          { fontSize: iconSizes[size] },
          variant === 'ghost' && styles.ghostIcon,
        ]}
      >
        {icon}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  primary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  secondary: {
    backgroundColor: '#374151',
    borderColor: '#4B5563',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: '#374151',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    color: '#fff',
    fontWeight: '500',
    letterSpacing: 1,
  },
  ghostIcon: {
    color: '#9CA3AF',
  },
});
