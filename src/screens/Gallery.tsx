import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Platform,
    Modal,
    Dimensions,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomBar from '../Component/BottomBar';
import GradientBackground from '../Component/GradientBackground';
import { authStorage } from '../utils/authStorage';
import * as NvrSdk from '../native/NvrSdk';
import Video from 'react-native-video';
import { VLCPlayer } from 'react-native-vlc-media-player';

const { width, height } = Dimensions.get('window');

interface MediaItem {
    id: string;
    name: string;
    path: string;
    time: string;
    duration?: string;
    size: string;
    type: 'Images' | 'Videos';
    thumbnail?: string;
    rawTime: number;
}

const Gallery: React.FC = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { initialTab } = (route.params as any) || {};
    const [activeTab, setActiveTab] = useState<'Images' | 'Videos'>(
        initialTab || 'Images',
    );
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [viewerItem, setViewerItem] = useState<MediaItem | null>(null);
    const [failedThumbs, setFailedThumbs] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadUserAndFiles();
    }, [activeTab]);

    const loadUserAndFiles = async () => {
        setLoading(true);
        try {
            const user = await authStorage.getUser();
            setCurrentUser(user);
            const userTag = (user?.email || user?.username || 'user').replace(
                /[^a-zA-Z0-9]/g,
                '_',
            );

            const folder =
                activeTab === 'Images'
                    ? `/sdcard/VMS/${userTag}/Snapshots`
                    : `/sdcard/VMS/${userTag}/Records`;

            console.log('GALLERY: Loading files from', folder);
            const files = await NvrSdk.listLocalFiles(folder);
            console.log(`GALLERY: Found ${files.length} files`);

            // Filter out internal thumbnails (.mp4.jpg) from the main list
            const mediaFiles = files.filter((f: any) => {
                if (activeTab === 'Images') {
                    const name = f.name.toLowerCase();
                    return (
                        (name.endsWith('.jpg') ||
                            name.endsWith('.jpeg') ||
                            name.endsWith('.bmp') ||
                            name.endsWith('.png')) &&
                        !name.includes('.mp4.jpg')
                    );
                }
                return f.name.endsWith('.mp4') || f.name.endsWith('.ts') || f.name.endsWith('.avi');
            });

            const items: MediaItem[] = await Promise.all(
                mediaFiles.map(async (f: any) => {
                    let thumb = undefined;
                    if (activeTab === 'Videos') {
                        try {
                            // 1. Check if the manual thumbnail (.ts.jpg or .mp4.jpg) exists
                            const thumbPath = f.path + '.jpg';
                            const hasThumb = files.some(
                                (file: any) => file.path === thumbPath,
                            );

                            if (hasThumb) {
                                thumb = `file://${thumbPath}`;
                            } else {
                                // 2. Fallback to native extractor
                                thumb = await NvrSdk.getVideoThumbnail(f.path);
                            }
                        } catch (e) {
                            console.log('GALLERY: Thumb fail for', f.name);
                        }
                    } else {
                        thumb = `file://${f.path}`;
                    }

                    return {
                        id: f.path,
                        name: f.name,
                        path: f.path,
                        time: new Date(f.time).toLocaleString(),
                        size: (f.size / (1024 * 1024)).toFixed(2) + ' MB',
                        type: activeTab,
                        thumbnail: thumb,
                        rawTime: f.time,
                    };
                }),
            );

            // Sort by time descending
            items.sort((a, b) => b.rawTime - a.rawTime);
            setMediaItems(items);
        } catch (error) {
            console.error('GALLERY: Failed to load', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (item: MediaItem) => {
        Alert.alert(
            'Delete Confirmation',
            `Are you sure you want to delete ${item.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const ok = await NvrSdk.deleteLocalFile(item.path);
                        if (ok) {
                            setMediaItems(prev => prev.filter(i => i.id !== item.id));
                        } else {
                            Alert.alert('Error', 'Failed to delete file.');
                        }
                    },
                },
            ],
        );
    };

    const handleDownload = async (item: MediaItem) => {
        try {
            await NvrSdk.saveMediaToPublic(
                item.path,
                activeTab === 'Images' ? 'image' : 'video',
            );
            Alert.alert(
                'Success',
                'File has been saved to your device (Pictures/VMS or Movies/VMS folder).',
            );
        } catch (e) {
            console.error('Download failed', e);
            Alert.alert('Error', 'Failed to download file to public storage.');
        }
    };

    const renderMediaItem = (item: MediaItem) => (
        <TouchableOpacity
            key={item.id}
            style={styles.mediaCard}
            onPress={() => {
                if (item.type === 'Videos') {
                    (navigation as any).navigate('LocalRecordingPlayer', { filePath: item.path, title: item.name });
                } else {
                    setViewerItem(item);
                }
            }}
            activeOpacity={0.7}
        >
            {/* Thumbnail */}
            <View style={styles.thumbnailContainer}>
                {item.thumbnail && !failedThumbs[item.id] ? (
                    <Image
                        source={{ uri: item.thumbnail }}
                        style={styles.thumbnailImage}
                        onError={() => {
                            setFailedThumbs(prev => ({ ...prev, [item.id]: true }));
                        }}
                    />
                ) : (
                    <View style={styles.playIconContainer}>
                        <Icon
                            name={item.type === 'Images' ? 'image-outline' : 'play'}
                            size={24}
                            color="#A83232"
                        />
                    </View>
                )}
                {item.type === 'Videos' && (
                    <View style={styles.playOverlay}>
                        <Icon name="play-circle-outline" size={30} color="#FFF" />
                    </View>
                )}
            </View>

            {/* Details */}
            <View style={styles.detailsContainer}>
                <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                    <Icon
                        name={
                            item.type === 'Images' ? 'image-outline' : 'movie-open-outline'
                        }
                        size={16}
                        color="#666"
                        style={[styles.detailIcon, { marginTop: 2 }]}
                    />
                    <Text
                        style={[styles.detailText, { fontWeight: '600' }]}
                        numberOfLines={1}
                    >
                        {item.name}
                    </Text>
                    <TouchableOpacity
                        style={styles.moreIcon}
                        onPress={() => {
                            Alert.alert('Options', item.name, [
                                { text: 'Download', onPress: () => handleDownload(item) },
                                {
                                    text: 'Delete',
                                    onPress: () => handleDelete(item),
                                    style: 'destructive',
                                },
                                { text: 'Cancel', style: 'cancel' },
                            ]);
                        }}
                    >
                        <Icon name="dots-vertical" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <View style={styles.detailRow}>
                    <Icon
                        name="clock-outline"
                        size={14}
                        color="#888"
                        style={styles.detailIcon}
                    />
                    <Text style={styles.detailTextSmall}>{item.time}</Text>
                </View>

                <View style={[styles.detailRow, { justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon
                            name="database-outline"
                            size={14}
                            color="#888"
                            style={styles.detailIcon}
                        />
                        <Text style={styles.detailTextSmall}>{item.size}</Text>
                    </View>
                    <View style={styles.viewBadge}>
                        <Text style={styles.viewBadgeText}>Tap to View</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <GradientBackground>
            <StatusBar
                barStyle="dark-content"
                backgroundColor="transparent"
                translucent
            />
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="chevron-left" size={30} color="#A83232" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={loadUserAndFiles}>
                        <Icon name="refresh" size={26} color="#A83232" />
                    </TouchableOpacity>
                </View>

                <View style={styles.titleContainer}>
                    <Text style={styles.pageTitle}>Gallery</Text>
                    <Text style={styles.pageSubTitle}>
                        {currentUser?.email || 'Guest Account'}
                    </Text>
                </View>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === 'Images' && styles.activeTab,
                        ]}
                        onPress={() => setActiveTab('Images')}
                    >
                        <Icon
                            name="image-outline"
                            size={20}
                            color={activeTab === 'Images' ? '#FFF' : '#AC3E41'}
                            style={{ marginRight: 8 }}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'Images' && styles.activeTabText,
                            ]}
                        >
                            Images
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === 'Videos' && styles.activeTab,
                        ]}
                        onPress={() => setActiveTab('Videos')}
                    >
                        <Icon
                            name="movie-outline"
                            size={20}
                            color={activeTab === 'Videos' ? '#FFF' : '#AC3E41'}
                            style={{ marginRight: 8 }}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'Videos' && styles.activeTabText,
                            ]}
                        >
                            Videos
                        </Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View
                        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                    >
                        <ActivityIndicator size="large" color="#A83232" />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {mediaItems.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Icon name="folder-outline" size={80} color="#DDD" />
                                <Text style={styles.emptyText}>
                                    No {activeTab.toLowerCase()} found
                                </Text>
                            </View>
                        ) : (
                            mediaItems.map(renderMediaItem)
                        )}
                    </ScrollView>
                )}

                {/* Media Viewer Modal */}
                <Modal
                    visible={!!viewerItem}
                    transparent={false}
                    animationType="fade"
                    onRequestClose={() => setViewerItem(null)}
                >
                    <View style={styles.viewerContainer}>
                        <StatusBar barStyle="light-content" backgroundColor="#000" />

                        <View style={styles.viewerHeader}>
                            <TouchableOpacity
                                style={styles.viewerClose}
                                onPress={() => setViewerItem(null)}
                            >
                                <Icon name="close" size={30} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.viewerTitle} numberOfLines={1}>
                                {viewerItem?.name}
                            </Text>
                            <TouchableOpacity
                                style={styles.viewerAction}
                                onPress={() => viewerItem && handleDownload(viewerItem)}
                            >
                                <Icon name="download" size={26} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.viewerContent}>
                            {viewerItem?.type === 'Images' ? (
                                <Image
                                    source={{ uri: `file://${viewerItem.path}` }}
                                    style={styles.fullImage as any}
                                    resizeMode="contain"
                                />
                            ) : viewerItem ? (
                                <View style={styles.videoPlayerWrapper}>
                                    {/* Debug Logs */}
                                    {(() => {
                                        const playUri = viewerItem.path.startsWith('file://')
                                            ? viewerItem.path
                                            : `file://${viewerItem.path}`;
                                        console.log('PLAY_URI:', playUri);
                                        return null;
                                    })()}

                                    <VLCPlayer
                                        style={styles.fullVideo as any}
                                        source={{
                                            uri: viewerItem.path.startsWith('file://')
                                                ? viewerItem.path.replace('file://', 'file:///')
                                                : `file:///${viewerItem.path.startsWith('/') ? viewerItem.path.substring(1) : viewerItem.path}`,
                                        }}
                                        videoAspectRatio="16:9"
                                        paused={false}
                                        onError={(e: any) =>
                                            console.log('VIDEO_ERROR:', JSON.stringify(e))
                                        }
                                    />
                                </View>
                            ) : null}
                        </View>

                        <View style={styles.viewerFooter}>
                            <Text style={styles.viewerFooterText}>{viewerItem?.time}</Text>
                            <Text style={styles.viewerFooterText}>{viewerItem?.size}</Text>
                        </View>
                    </View>
                </Modal>

                <BottomBar />
            </SafeAreaView>
        </GradientBackground>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 10 : 50,
        paddingBottom: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffebee',
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleContainer: {
        marginTop: 10,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#040835ff',
    },
    pageSubTitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        backgroundColor: '#eee',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: '#AA393C',
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#AC3E41',
    },
    activeTabText: {
        color: '#FFF',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    mediaCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 12,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    thumbnailContainer: {
        width: 100,
        height: 100,
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        overflow: 'hidden',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffebee',
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailsContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    detailIcon: {
        marginRight: 6,
    },
    detailText: {
        fontSize: 14,
        color: '#444',
        flex: 1,
    },
    detailTextSmall: {
        fontSize: 12,
        color: '#888',
    },
    moreIcon: {
        padding: 4,
    },
    viewBadge: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    viewBadgeText: {
        fontSize: 10,
        color: '#888',
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 20,
        fontSize: 16,
        color: '#999',
    },
    // Viewer Styles
    viewerContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    viewerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    viewerClose: {
        padding: 5,
    },
    viewerTitle: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginHorizontal: 15,
    },
    viewerAction: {
        padding: 5,
    },
    viewerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: width,
        height: height * 0.7,
    },
    fullVideo: {
        width: width,
        height: width * (9 / 16),
    },
    videoPlayerWrapper: {
        width: width,
        height: width * (9 / 16),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    videoOverlay: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    videoOverlayText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    viewerFooter: {
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    viewerFooterText: {
        color: '#CCC',
        fontSize: 12,
    },
});

export default Gallery;
