import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { PLAYBACK_SPEEDS } from '../utils/audioUtils';
import * as downloadService from '../services/downloadService';
import { clearDatabase } from '../db/schema';

export const SettingsScreen: React.FC = () => {
  const {
    defaultPlaybackRate,
    skipSilence,
    skipForwardSeconds,
    skipBackwardSeconds,
    downloadOverWifiOnly,
    autoDeletePlayed,
    visualizer,
    darkMode,
    setDefaultPlaybackRate,
    setSkipSilence,
    setSkipForwardSeconds,
    setSkipBackwardSeconds,
    setDownloadOverWifiOnly,
    setAutoDeletePlayed,
    setVisualizerSettings,
  } = useSettingsStore();

  const handleClearDownloads = () => {
    Alert.alert(
      'Clear All Downloads',
      'This will delete all downloaded episodes. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await downloadService.clearAllDownloads();
            Alert.alert('Success', 'All downloads have been cleared');
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all podcasts, episodes, and downloads. This cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await downloadService.clearAllDownloads();
            await clearDatabase();
            Alert.alert('Success', 'All data has been cleared');
          },
        },
      ]
    );
  };

  const SettingRow: React.FC<{
    label: string;
    value?: string;
    children?: React.ReactNode;
  }> = ({ label, value, children }) => (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      {value ? (
        <Text style={styles.settingValue}>{value}</Text>
      ) : (
        children
      )}
    </View>
  );

  const SettingSection: React.FC<{
    title: string;
    children: React.ReactNode;
  }> = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <SettingSection title="Playback">
        <SettingRow label="Default Speed">
          <View style={styles.speedOptions}>
            {[0.5, 1.0, 1.5, 2.0].map((speed) => (
              <TouchableOpacity
                key={speed}
                style={[
                  styles.speedOption,
                  defaultPlaybackRate === speed && styles.speedOptionActive,
                ]}
                onPress={() => setDefaultPlaybackRate(speed)}
              >
                <Text
                  style={[
                    styles.speedOptionText,
                    defaultPlaybackRate === speed && styles.speedOptionTextActive,
                  ]}
                >
                  {speed}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SettingRow>

        <SettingRow label="Skip Forward">
          <View style={styles.speedOptions}>
            {[15, 30, 45, 60].map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[
                  styles.speedOption,
                  skipForwardSeconds === sec && styles.speedOptionActive,
                ]}
                onPress={() => setSkipForwardSeconds(sec)}
              >
                <Text
                  style={[
                    styles.speedOptionText,
                    skipForwardSeconds === sec && styles.speedOptionTextActive,
                  ]}
                >
                  {sec}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SettingRow>

        <SettingRow label="Skip Backward">
          <View style={styles.speedOptions}>
            {[10, 15, 30, 45].map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[
                  styles.speedOption,
                  skipBackwardSeconds === sec && styles.speedOptionActive,
                ]}
                onPress={() => setSkipBackwardSeconds(sec)}
              >
                <Text
                  style={[
                    styles.speedOptionText,
                    skipBackwardSeconds === sec && styles.speedOptionTextActive,
                  ]}
                >
                  {sec}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SettingRow>

        <SettingRow label="Skip Silence">
          <Switch
            value={skipSilence}
            onValueChange={setSkipSilence}
            trackColor={{ false: '#374151', true: '#FFFFFF' }}
            thumbColor="#fff"
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Downloads">
        <SettingRow label="Download over Wi-Fi only">
          <Switch
            value={downloadOverWifiOnly}
            onValueChange={setDownloadOverWifiOnly}
            trackColor={{ false: '#374151', true: '#FFFFFF' }}
            thumbColor="#fff"
          />
        </SettingRow>

        <SettingRow label="Auto-delete played episodes">
          <Switch
            value={autoDeletePlayed}
            onValueChange={setAutoDeletePlayed}
            trackColor={{ false: '#374151', true: '#FFFFFF' }}
            thumbColor="#fff"
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Visualizer">
        <SettingRow label="Auto-transition presets">
          <Switch
            value={visualizer.autoTransition}
            onValueChange={(value) =>
              setVisualizerSettings({ autoTransition: value })
            }
            trackColor={{ false: '#374151', true: '#FFFFFF' }}
            thumbColor="#fff"
          />
        </SettingRow>

        <SettingRow label="Beat-triggered transitions">
          <Switch
            value={visualizer.beatTriggeredTransition}
            onValueChange={(value) =>
              setVisualizerSettings({ beatTriggeredTransition: value })
            }
            trackColor={{ false: '#374151', true: '#FFFFFF' }}
            thumbColor="#fff"
          />
        </SettingRow>

        <SettingRow label="Sensitivity">
          <View style={styles.speedOptions}>
            {[0.3, 0.5, 0.7, 1.0].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.speedOption,
                  visualizer.sensitivity === value && styles.speedOptionActive,
                ]}
                onPress={() => setVisualizerSettings({ sensitivity: value })}
              >
                <Text
                  style={[
                    styles.speedOptionText,
                    visualizer.sensitivity === value &&
                      styles.speedOptionTextActive,
                  ]}
                >
                  {value === 0.3 ? 'Low' : value === 0.5 ? 'Med' : value === 0.7 ? 'High' : 'Max'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SettingRow>
      </SettingSection>

      <SettingSection title="Storage">
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleClearDownloads}
        >
          <Text style={styles.dangerButtonText}>Clear All Downloads</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dangerButton, styles.dangerButtonRed]}
          onPress={handleClearData}
        >
          <Text style={styles.dangerButtonText}>Clear All Data</Text>
        </TouchableOpacity>
      </SettingSection>

      <View style={styles.footer}>
        <Text style={styles.version}>Podracer v1.0.0</Text>
        <Text style={styles.credits}>Built with React Native + Expo</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  section: {
    paddingTop: 24,
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
  },
  settingValue: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  speedOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  speedOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  speedOptionActive: {
    backgroundColor: '#FFFFFF',
  },
  speedOptionText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  speedOptionTextActive: {
    color: '#fff',
  },
  dangerButton: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  dangerButtonRed: {
    borderBottomWidth: 0,
  },
  dangerButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  version: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 4,
  },
  credits: {
    color: '#4B5563',
    fontSize: 12,
  },
});
