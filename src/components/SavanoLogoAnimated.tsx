import React, { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';
import { colors } from '../theme/tokens';

interface SavanoLogoAnimatedProps {
  size?: number;
  spinning?: boolean;
}

export function SavanoLogoAnimated({ size = 38, spinning = false }: SavanoLogoAnimatedProps) {
  const [scale] = useState(() => new Animated.Value(0.75));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  useEffect(() => {
    if (!spinning) return;
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, spinning]);

  return (
    <Animated.View style={{ width: size, height: size, opacity, transform: [{ scale }] }}>
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Polygon
          points="32,10 51,20 32,30 13,20"
          fill={colors.ivory}
          stroke={colors.bg}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <Polygon
          points="13,20 32,30 32,52 13,42"
          fill="#18181D"
          stroke={colors.borderStrong}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <Polygon
          points="51,20 32,30 32,52 51,42"
          fill={colors.surface}
          stroke={colors.borderStrong}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        {/* Fita verde lacrando tampa e lateral */}
        <Path
          d="M22.5 15L41.5 25V38"
          stroke={colors.emerald}
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* S limpo na face esquerda */}
        <Path
          d="M26 30L19 26.5V31.5L26 35V40L19 36.5"
          stroke={colors.ivory}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}
