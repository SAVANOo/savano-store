import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

interface AppIconProps {
  uri: string;
  name: string;
  size?: number;
}

export function AppIcon({ uri, name, size = 56 }: AppIconProps) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || 'S';

  if (failed || !uri) {
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: size * 0.25 },
        ]}
      >
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, { width: size, height: size, borderRadius: size * 0.25 }]}
      onError={() => setFailed(true)}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fallback: {
    backgroundColor: colors.emeraldMuted,
    borderWidth: 1,
    borderColor: colors.emeraldDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: colors.emerald,
    fontWeight: '700',
  },
});
