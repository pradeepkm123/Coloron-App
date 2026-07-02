/**
 * NVR Channel Inspector - Debug Utility
 * 
 * Helps visualize and debug NVR channel filtering in your app.
 * Add this to any screen to see what's happening with your NVR channels.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { deviceStorage, Channel, Device } from '../utils/deviceStorage';

interface ChannelStats {
    total: number;
    connected: number;
    online: number;
    offline: number;
    customNamed: number;
    defaultNamed: number;
    hasStream: number;
    hasIP: number;
}

/**
 * Debug Component - Add to any screen temporarily to inspect NVR channels
 * 
 * Usage:
 * import { NVRChannelInspector } from '../utils/nvrChannelInspector';
 * 
 * <NVRChannelInspector />
 */
export const NVRChannelInspector: React.FC = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [stats, setStats] = useState<ChannelStats | null>(null);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        loadDevices();
    }, []);

    const loadDevices = async () => {
        const allDevices = await deviceStorage.getDevices();
        setDevices(allDevices);

        // Calculate stats for first NVR found
        const nvr = allDevices.find(d => d.isNVR && d.channels);
        if (nvr && nvr.channels) {
            const channels = nvr.channels;
            const connected = deviceStorage.filterConnectedChannels(channels);

            setStats({
                total: channels.length,
                connected: connected.length,
                online: channels.filter(ch => ch.online).length,
                offline: channels.filter(ch => !ch.online).length,
                customNamed: channels.filter(ch => {
                    return ch.name && !(/^(CH\d+|Camera \d+|Channel \d+)$/i.test(ch.name));
                }).length,
                defaultNamed: channels.filter(ch => {
                    return /^(CH\d+|Camera \d+|Channel \d+)$/i.test(ch.name);
                }).length,
                hasStream: channels.filter(ch => ch.streamUrl).length,
                hasIP: channels.filter(ch => ch.ip).length,
            });
        }
    };

    const nvr = devices.find(d => d.isNVR && d.channels);

    if (!nvr || !nvr.channels) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>🔍 NVR Channel Inspector</Text>
                <Text style={styles.noData}>No NVR found with channels</Text>
            </View>
        );
    }

    const connectedChannels = deviceStorage.filterConnectedChannels(nvr.channels);
    const filteredOut = nvr.channels.filter(ch =>
        !connectedChannels.find(c => c.id === ch.id)
    );

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>🔍 NVR Channel Inspector</Text>
            <Text style={styles.subtitle}>{nvr.name}</Text>

            {/* Stats Summary */}
            <View style={styles.statsBox}>
                <Text style={styles.statsTitle}>📊 Channel Statistics</Text>
                {stats && (
                    <>
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>Total Channels:</Text>
                            <Text style={styles.statValue}>{stats.total}</Text>
                        </View>
                        <View style={[styles.statRow, styles.highlight]}>
                            <Text style={styles.statLabel}>✅ Connected (Shown):</Text>
                            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.connected}</Text>
                        </View>
                        <View style={[styles.statRow, styles.highlight]}>
                            <Text style={styles.statLabel}>❌ Filtered Out (Hidden):</Text>
                            <Text style={[styles.statValue, { color: '#EF4444' }]}>
                                {stats.total - stats.connected}
                            </Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>🟢 Online:</Text>
                            <Text style={styles.statValue}>{stats.online}</Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>⚫ Offline:</Text>
                            <Text style={styles.statValue}>{stats.offline}</Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>📝 Custom Names:</Text>
                            <Text style={styles.statValue}>{stats.customNamed}</Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>🔤 Default Names:</Text>
                            <Text style={styles.statValue}>{stats.defaultNamed}</Text>
                        </View>
                    </>
                )}
            </View>

            {/* Connected Channels */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>✅ Connected Channels ({connectedChannels.length})</Text>
                <Text style={styles.sectionSubtitle}>These cameras are visible in your app</Text>
                {connectedChannels.map((ch, idx) => (
                    <View key={idx} style={styles.channelCard}>
                        <View style={styles.channelHeader}>
                            <Text style={styles.channelName}>{ch.name}</Text>
                            <Text style={[styles.badge, ch.online ? styles.badgeOnline : styles.badgeOffline]}>
                                {ch.online ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                        <Text style={styles.channelMeta}>Channel {ch.id + 1}</Text>
                        {ch.ip && <Text style={styles.channelMeta}>IP: {ch.ip}</Text>}
                        {ch.streamUrl && (
                            <Text style={styles.channelMeta} numberOfLines={1}>
                                Stream: {ch.streamUrl}
                            </Text>
                        )}
                    </View>
                ))}
            </View>

            {/* Filtered Out Channels */}
            <TouchableOpacity
                style={styles.section}
                onPress={() => setExpanded(!expanded)}
            >
                <View style={styles.expandHeader}>
                    <Text style={styles.sectionTitle}>
                        ❌ Filtered Out ({filteredOut.length})
                    </Text>
                    <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                    These empty slots are hidden from users
                </Text>
            </TouchableOpacity>

            {expanded && filteredOut.map((ch, idx) => (
                <View key={idx} style={[styles.channelCard, styles.filteredCard]}>
                    <View style={styles.channelHeader}>
                        <Text style={[styles.channelName, { color: '#9CA3AF' }]}>{ch.name}</Text>
                        <Text style={[styles.badge, styles.badgeFiltered]}>Hidden</Text>
                    </View>
                    <Text style={styles.channelMeta}>Channel {ch.id + 1}</Text>
                    <Text style={[styles.channelMeta, { color: '#EF4444' }]}>
                        Reason: Default name + offline
                    </Text>
                </View>
            ))}

            <View style={{ height: 50 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#F9FAFB',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 20,
    },
    noData: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 20,
    },
    statsBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    highlight: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        borderRadius: 6,
        marginVertical: 2,
    },
    statLabel: {
        fontSize: 14,
        color: '#4B5563',
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 8,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 12,
    },
    expandHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    expandIcon: {
        fontSize: 16,
        color: '#6B7280',
    },
    channelCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#10B981',
    },
    filteredCard: {
        borderLeftColor: '#EF4444',
        opacity: 0.6,
    },
    channelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    channelName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
    },
    channelMeta: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        fontSize: 11,
        fontWeight: '600',
    },
    badgeOnline: {
        backgroundColor: '#D1FAE5',
        color: '#065F46',
    },
    badgeOffline: {
        backgroundColor: '#FEE2E2',
        color: '#991B1B',
    },
    badgeFiltered: {
        backgroundColor: '#F3F4F6',
        color: '#6B7280',
    },
});

/**
 * Console Logger - Use in any component without UI
 */
export const logNVRChannelStatus = async () => {
    const devices = await deviceStorage.getDevices();
    const nvr = devices.find(d => d.isNVR && d.channels);

    if (!nvr || !nvr.channels) {
        console.log('❌ No NVR found with channels');
        return;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📡 NVR: ${nvr.name}`);
    console.log('='.repeat(60));

    const all = nvr.channels;
    const connected = deviceStorage.filterConnectedChannels(all);
    const filtered = all.filter(ch => !connected.find(c => c.id === ch.id));

    console.log(`\n📊 STATISTICS:`);
    console.log(`   Total Channels: ${all.length}`);
    console.log(`   ✅ Connected (Visible): ${connected.length}`);
    console.log(`   ❌ Filtered Out (Hidden): ${filtered.length}`);

    console.log(`\n✅ CONNECTED CHANNELS (${connected.length}):`);
    connected.forEach((ch, i) => {
        console.log(`   ${i + 1}. ${ch.name} - ${ch.online ? '🟢 Online' : '⚫ Offline'}`);
    });

    if (filtered.length > 0) {
        console.log(`\n❌ FILTERED OUT (${filtered.length}):`);
        filtered.forEach((ch, i) => {
            console.log(`   ${i + 1}. ${ch.name} - Offline + Default Name`);
        });
    }

    console.log('\n' + '='.repeat(60) + '\n');
};
