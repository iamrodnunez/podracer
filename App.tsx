import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer, DarkTheme, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from 'react-native';

import {
  HomeScreen,
  DiscoverScreen,
  PodcastDetailScreen,
  PodcastPreviewScreen,
  EpisodeDetailScreen,
  EpisodePlayerScreen,
  VisualizerScreen,
  QueueScreen,
  DownloadsScreen,
  SettingsScreen,
} from './src/screens';
import { MiniPlayer } from './src/components/player';
import { Logo } from './src/components/common';
import { usePlayerStore } from './src/store/usePlayerStore';
import { usePodcastStore } from './src/store/usePodcastStore';
import { initializeDatabase } from './src/db/schema';
import { setupPlayer } from './src/services/audioService';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Minimalist CSS-drawn icons
const TabIcon: React.FC<{ name: string; focused: boolean }> = ({
  name,
  focused,
}) => {
  const color = focused ? '#fff' : '#6B7280';

  const renderIcon = () => {
    switch (name) {
      case 'Home':
        // House icon
        return (
          <View style={tabIconStyles.iconContainer}>
            <View style={[tabIconStyles.houseRoof, { borderBottomColor: color }]} />
            <View style={[tabIconStyles.houseBody, { borderColor: color }]} />
          </View>
        );
      case 'Discover':
        // Magnifying glass
        return (
          <View style={tabIconStyles.iconContainer}>
            <View style={[tabIconStyles.searchCircle, { borderColor: color }]} />
            <View style={[tabIconStyles.searchHandle, { backgroundColor: color }]} />
          </View>
        );
      case 'Downloads':
        // Down arrow
        return (
          <View style={tabIconStyles.iconContainer}>
            <View style={[tabIconStyles.downloadLine, { backgroundColor: color }]} />
            <View style={[tabIconStyles.downloadArrow, { borderTopColor: color }]} />
            <View style={[tabIconStyles.downloadBase, { backgroundColor: color }]} />
          </View>
        );
      case 'Settings':
        // Gear icon
        return (
          <View style={tabIconStyles.iconContainer}>
            <View style={[tabIconStyles.gearOuter, { borderColor: color }]} />
            <View style={[tabIconStyles.gearInner, { backgroundColor: color }]} />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[tabIconStyles.container, focused && tabIconStyles.focused]}>
      {renderIcon()}
    </View>
  );
};

const tabIconStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focused: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFFFFF',
  },
  iconContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // House icon
  houseRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderLeftColor: 'transparent',
    borderRightWidth: 11,
    borderRightColor: 'transparent',
    borderBottomWidth: 8,
  },
  houseBody: {
    width: 14,
    height: 10,
    borderWidth: 1.5,
    borderTopWidth: 0,
    marginTop: -1,
  },
  // Magnifying glass
  searchCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    position: 'absolute',
    top: 2,
    left: 2,
  },
  searchHandle: {
    width: 6,
    height: 1.5,
    position: 'absolute',
    bottom: 4,
    right: 2,
    transform: [{ rotate: '45deg' }],
  },
  // Download arrow
  downloadLine: {
    width: 2,
    height: 10,
    position: 'absolute',
    top: 2,
  },
  downloadArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderLeftColor: 'transparent',
    borderRightWidth: 5,
    borderRightColor: 'transparent',
    borderTopWidth: 5,
    position: 'absolute',
    top: 10,
  },
  downloadBase: {
    width: 14,
    height: 2,
    position: 'absolute',
    bottom: 2,
  },
  // Gear icon
  gearOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
  },
  gearInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
  },
});

const TabNavigatorContent: React.FC = () => {
  const navigation = useNavigation<any>();
  const { currentEpisode } = usePlayerStore();
  const { podcasts } = usePodcastStore();

  const podcast = currentEpisode
    ? podcasts.find((p) => p.id === currentEpisode.podcastId)
    : null;

  const handleMiniPlayerPress = () => {
    navigation.navigate('Player');
  };

  return (
    <View style={styles.tabContainer}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => (
            <TabIcon name={route.name} focused={focused} />
          ),
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: '#6B7280',
          tabBarStyle: {
            backgroundColor: '#1F2937',
            borderTopColor: '#374151',
            borderTopWidth: 1,
            paddingTop: 12,
            paddingBottom: 8,
            height: 64,
          },
          tabBarShowLabel: false,
          headerStyle: {
            backgroundColor: '#111827',
            shadowColor: 'transparent',
            elevation: 0,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '500',
            letterSpacing: 1,
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerTitle: () => <Logo size="small" showText={true} horizontal={true} />,
          }}
        />
        <Tab.Screen
          name="Discover"
          component={DiscoverScreen}
          options={{ title: 'DISCOVER' }}
        />
        <Tab.Screen
          name="Downloads"
          component={DownloadsScreen}
          options={{ title: 'DOWNLOADS' }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'SETTINGS' }}
        />
      </Tab.Navigator>

      {currentEpisode && (
        <MiniPlayer
          onPress={handleMiniPlayerPress}
          artworkUrl={currentEpisode.artworkUrl || podcast?.artworkUrl || undefined}
        />
      )}
    </View>
  );
};

const TabNavigator: React.FC = () => {
  return <TabNavigatorContent />;
};

const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#111827',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '500',
          letterSpacing: 1,
        },
        cardStyle: {
          backgroundColor: '#111827',
        },
      }}
    >
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PodcastDetail"
        component={PodcastDetailScreen}
        options={{ title: 'PODCAST' }}
      />
      <Stack.Screen
        name="PodcastPreview"
        component={PodcastPreviewScreen}
        options={{ title: 'PODCAST' }}
      />
      <Stack.Screen
        name="EpisodeDetail"
        component={EpisodeDetailScreen}
        options={{ title: 'EPISODE' }}
      />
      <Stack.Screen
        name="Player"
        component={EpisodePlayerScreen}
        options={{ title: 'NOW PLAYING' }}
      />
      <Stack.Screen
        name="Visualizer"
        component={VisualizerScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="Queue"
        component={QueueScreen}
        options={{ title: 'QUEUE' }}
      />
    </Stack.Navigator>
  );
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeDatabase();
        await setupPlayer();
        setIsReady(true);
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setIsReady(true);
      }
    };

    initialize();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Logo size="large" />
        <ActivityIndicator size="small" color="#FFFFFF" style={styles.loadingSpinner} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorHint}>
          Please restart the app. If the problem persists, try reinstalling.
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <NavigationContainer
          theme={{
            ...DarkTheme,
            colors: {
              ...DarkTheme.colors,
              primary: '#FFFFFF',
              background: '#111827',
              card: '#1F2937',
              text: '#fff',
              border: '#374151',
              notification: '#FFFFFF',
            },
          }}
        >
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  tabContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    marginTop: 32,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 32,
    color: '#EF4444',
    fontWeight: '300',
    marginBottom: 16,
    width: 48,
    height: 48,
    textAlign: 'center',
    lineHeight: 48,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
  },
});
