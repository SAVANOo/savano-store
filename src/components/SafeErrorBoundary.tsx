import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';

interface SafeErrorBoundaryState {
  hasError: boolean;
}

export class SafeErrorBoundary extends React.Component<
  { children: React.ReactNode },
  SafeErrorBoundaryState
> {
  state: SafeErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SafeErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: unknown) {
    // Nunca expõe stack traces ou detalhes internos na UI
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Algo deu errado</Text>
          <Text style={styles.subtitle}>
            Ocorreu uma falha inesperada na interface da Savano Store.
          </Text>
          <Pressable onPress={this.handleReset} style={styles.button}>
            <Text style={styles.buttonText}>Tentar novamente</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.emerald,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#04120B',
    fontSize: 14,
    fontWeight: '700',
  },
});
