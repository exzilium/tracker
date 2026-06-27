import React from 'react';
import { Text } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  iconString?: string;
  size?: number;
  color?: string;
}

export default function EntryIcon({ iconString, size = 24, color }: Props) {
  if (!iconString) return null;

  if (iconString.includes(':')) {
    const [family, name] = iconString.split(':');
    
    if (family === 'Ionicons') {
      return <Ionicons name={name as any} size={size} color={color} />;
    }
    if (family === 'FontAwesome5') {
      return <FontAwesome5 name={name as any} size={size} color={color} />;
    }
    if (family === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
    }
  }

  // Fallback for old emoji logs
  return <Text style={{ fontSize: size, color }}>{iconString}</Text>;
}
