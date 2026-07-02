import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Text,
  SafeAreaView,
  Dimensions,
  Alert,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useIsFocused,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NvrSdk from '../native/NvrSdk';
import LivePlayer from '../components/LivePlayer';
import { GridType, GridIcon } from '../components/GridSelection';
import { Device, deviceStorage } from '../utils/deviceStorage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { authStorage } from '../utils/authStorage';
import { api } from '../utils/api';
import { localSettings } from '../utils/localSettings';

const requestStoragePermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  try {
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
      ]);
      return (
        granted[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ]);
      return (
        granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED
      );
    }
  } catch (err) {
    console.warn('Permission request error:', err);
    return false;
  }
};

const LandscapeLiveView: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'LandscapeLiveView'>>();
  const {
    userId,
    channelId,
    deviceId,
    deviceName,
    nvrUsername,
    nvrPassword,
    ip,
    type,
  } = route.params;

  const [gridStreamTypes, setGridStreamTypes] = useState<number[]>(
    Array(64).fill(1),
  ); // Default all to SD (1)
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [recHandle, setRecHandle] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [currentGrid, setCurrentGrid] = useState<GridType>(
    route.params.initialGrid || '1x1',
  );
  const [gridCells, setGridCells] = useState<(number | null)[]>(
    route.params.gridCells || Array(64).fill(null),
  );
  const [isGridSelectionVisible, setIsGridSelectionVisible] = useState(false);
  const [isChannelPanelVisible, setIsChannelPanelVisible] = useState(false);
  const [isDeviceDropdownVisible, setIsDeviceDropdownVisible] = useState(false);
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [currentDeviceParams, setCurrentDeviceParams] = useState(route.params);
  const [activeChannel, setActiveChannel] = useState(channelId);
  const [focusedCellIndex, setFocusedCellIndex] = useState(0);
  const [syncKey, setSyncKey] = useState(0);
  const [mediaToast, setMediaToast] = useState<{ visible: boolean; type: 'picture' | 'video'; path: string } | null>(null);
  const [showVisualFlash, setShowVisualFlash] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const [currentRecordInfo, setCurrentRecordInfo] = useState<{
    fileName: string;
    path: string;
    thumbPath?: string;
    channelId: number;
  } | null>(null);

  const recordingHandleRef = useRef<string | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const handlesRef = useRef<{ [key: string]: string | null }>({});
  const indexToKey = (idx: number) => `cell_${idx}`;
  const isScreenFocused = useIsFocused();
  const [previousGridConfig, setPreviousGridConfig] = useState<{
    type: GridType;
    cells: (number | null)[];
  } | null>(null);

  // 🚀 Performance Optimization: Staggered Loading
  const [loadingCellCount, setLoadingCellCount] = useState(0);
  const loadingTimerRef = useRef<any>(null);

  const lastTap = useRef<{ index: number; time: number } | null>(null);
  const hideTimeout = useRef<any>(null);
  const userIdRef = useRef<number | null>(route.params.userId || null);

  const resetHideTimer = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 5000);
  };

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      if (isRecordingRef.current && recordingHandleRef.current) {
        NvrSdk.stopLocalRecord(recordingHandleRef.current).catch(() => { });
      }
      const uid = userIdRef.current;
      if (uid !== null && uid >= 0) {
        console.log('[LandscapeLiveView] Cleanup: Preserving userId for background service', uid);
      }
    };
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => setRecordTimer(t => t + 1), 1000);
    } else {
      setRecordTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Force hide status bar and set landscape orientation
  useEffect(() => {
    StatusBar.setHidden(true);
    NvrSdk.setOrientation(0); // Landscape
    deviceStorage.getDevices().then(setAllDevices);
    return () => {
      StatusBar.setHidden(false);
      NvrSdk.setOrientation(1); // Portrait
    };
  }, []);

  // --- Staggered Loading Loop ---
  useEffect(() => {
    const gridSize = getGridCellCount(currentGrid);
    if (loadingCellCount < gridSize) {
      setLoadingCellCount(gridSize);
    }
  }, [currentGrid, loadingCellCount]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSnapshot = async () => {
    const chId =
      gridCells[focusedCellIndex] !== null && gridCells[focusedCellIndex] !== undefined
        ? gridCells[focusedCellIndex]
        : (activeChannel !== null && activeChannel !== undefined ? activeChannel : 0);

    if (chId === null || chId === undefined) {
      Alert.alert(
        'Selection Required',
        'Please select a camera channel cell first.',
      );
      return;
    }

    const hasPermission = await requestStoragePermissions();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Storage permissions are required to take a snapshot.');
      return;
    }

    try {
      // Visual Flash on capture
      setShowVisualFlash(true);
      setTimeout(() => setShowVisualFlash(false), 200);

      const user = await authStorage.getUser();
      const userTag = (user?.email || user?.username || 'user').replace(
        /[^a-zA-Z0-9]/g,
        '_',
      );
      const timestamp = Date.now();
      const safeDeviceName = currentDeviceParams.deviceName || 'LiveView';
      const fileName = `snap_${safeDeviceName.replace(/\s+/g, '')}_CH${chId + 1}_${timestamp}.jpg`;
      const initialPath = `/sdcard/VMS/${userTag}/Snapshots/${fileName}`;

      console.log(
        `LANDSCAPE_SNAPSHOT: Capturing channel ${chId} to ${initialPath}`,
      );

      const actualPath = await NvrSdk.captureSnapshot(
        currentDeviceParams.userId,
        chId,
        initialPath,
      );

      if (!actualPath) {
        throw new Error('Native captureSnapshot returned empty path');
      }

      // Save to DB so it appears in App Gallery immediately
      api.saveMedia({
        type: 'snapshot',
        fileName,
        filePath: actualPath,
        channelId: chId,
        deviceName: currentDeviceParams.deviceName || 'Unknown Device'
      }).catch(e => console.warn("Failed to save snapshot to DB:", e.message));

      // Save to public gallery and scan
      let publicPath = actualPath;
      try {
        publicPath = await NvrSdk.saveMediaToPublic(actualPath, 'image');
        await NvrSdk.scanFile(publicPath);
      } catch (scanErr) {
        console.warn('Failed to save to public gallery:', scanErr);
      }

      // Always scan the sandbox file too
      NvrSdk.scanFile(actualPath).catch(() => { });

      setMediaToast({
        visible: true,
        type: 'picture',
        path: actualPath,
      });

      // Automatically hide toast after 4 seconds
      setTimeout(() => {
        setMediaToast(prev => {
          if (prev && prev.path === actualPath) {
            return null;
          }
          return prev;
        });
      }, 4000);

    } catch (e: any) {
      console.error('LANDSCAPE_SNAPSHOT: Capture error', e);
      Alert.alert('Snapshot Failed', 'Check camera stream status.');
    }
  };

  const handleRecord = async () => {
    resetHideTimer();

    if (currentDeviceParams.userId === null || currentDeviceParams.userId === undefined || currentDeviceParams.userId < 0) {
      Alert.alert('Error', 'Not logged in to device.');
      return;
    }

    if (isRecording) {
      // STOP RECORDING
      const handleToStop = recordingHandleRef.current;
      setIsRecording(false);
      isRecordingRef.current = false;
      recordingHandleRef.current = null;
      setRecHandle(null);

      const savedPath = currentRecordInfo?.path;
      const savedThumbPath = currentRecordInfo?.thumbPath;
      const savedFileName = currentRecordInfo?.fileName;
      const savedChId = currentRecordInfo?.channelId;
      setRecordTimer(0);
      setCurrentRecordInfo(null);

      if (handleToStop) {
        (async () => {
          try {
            await NvrSdk.stopLocalRecord(handleToStop, true);
            console.log('RECORD_STOP_SUCCESS');
          } catch (e: any) {
            console.warn('RECORD: stopLocalRecord warning (file may still be saved):', e.message);
          }

          if (savedPath && savedFileName && savedChId !== undefined) {
            // Wait 800ms
            await new Promise(resolve => setTimeout(resolve, 800));

            NvrSdk.scanFile(savedPath).catch(() => { });

            // Copy to public Movies/VMS so it appears in system Gallery
            try {
              const publicPath = await NvrSdk.saveMediaToPublic(savedPath, 'recording');
              if (publicPath && publicPath !== savedPath) {
                await NvrSdk.scanFile(publicPath);
                console.log(`RECORD_SAVED_TO_GALLERY: ${publicPath}`);
              }
            } catch (publicErr) {
              console.warn('RECORD: Failed to save recording to public gallery:', publicErr);
            }

            // Check if thumbnail actually exists on disk
            let finalToastPath = savedPath;
            let thumbnailDbPath = '';
            if (savedThumbPath) {
              const hasThumb = await NvrSdk.checkFileExists(savedThumbPath);
              if (hasThumb) {
                finalToastPath = savedThumbPath;
                thumbnailDbPath = savedThumbPath;
              }
            }

            // Save metadata to backend DB
            try {
              const freshUser = await authStorage.getUser();
              const userEmail = freshUser?.email || freshUser?.username || '';
              const userIdVal = freshUser?.id || freshUser?._id || currentDeviceParams.userId || -1;

              api.saveMedia({
                type: 'recording',
                fileName: savedFileName,
                filePath: savedPath,
                thumbnailPath: thumbnailDbPath,
                channelId: savedChId,
                deviceName: currentDeviceParams.deviceName || 'Unknown Device',
                userEmail: String(userEmail),
                userId: Number(userIdVal),
              }).catch(e => {
                console.log('RECORD: DB sync silent fail', e.message);
              });
            } catch (userErr) {
              console.warn('RECORD: Failed to fetch user info for DB metadata:', userErr);
            }

            setMediaToast({
              visible: true,
              type: 'video',
              path: finalToastPath,
            });

            // Automatically hide toast after 5 seconds
            setTimeout(() => {
              setMediaToast(prev => {
                if (prev && (prev.path === finalToastPath || prev.path === savedPath)) {
                  return null;
                }
                return prev;
              });
            }, 5000);
          } else {
            console.warn('RECORD: savedPath or fileName missing, cannot complete gallery save');
          }
        })();
      }
    } else {
      // START RECORDING
      const hasPermission = await requestStoragePermissions();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Storage permissions are required to start recording.');
        return;
      }

      const chId =
        gridCells[focusedCellIndex] !== null && gridCells[focusedCellIndex] !== undefined
          ? gridCells[focusedCellIndex]
          : (activeChannel !== null && activeChannel !== undefined ? activeChannel : 0);

      if (chId === null || chId === undefined || chId < 0) {
        Alert.alert('Error', 'No camera selected.');
        return;
      }

      const liveHandle = handlesRef.current[indexToKey(focusedCellIndex)];
      if (!liveHandle || liveHandle === '-1') {
        Alert.alert('Error', 'Camera is not currently playing natively. Please wait for stream.');
        return;
      }

      const hasSpace = await localSettings.checkDiskSpace(50);
      if (!hasSpace) {
        Alert.alert('Storage Full', 'Insufficient space for local recording.');
        return;
      }

      try {
        const freshUser = await authStorage.getUser();
        const userTag = (freshUser?.email || freshUser?.username || 'user').replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = new Date().getTime();
        const fileName = `rec_${chId}_${timestamp}.mp4`;
        const path = `/sdcard/VMS/${userTag}/Records/${fileName}`;
        const thumbPath = `${path}.jpg`;

        console.log('RECORD_START_REQUEST');
        console.log(`RECORD_HANDLE: ${liveHandle}`);
        console.log(`RECORD_PATH: ${path}`);

        // Call SDK first — only update UI state if it succeeds
        // The Java layer handles MakeKeyFrame + 300ms delay internally
        const result = await NvrSdk.startLocalRecord(
          liveHandle,
          path,
          true,
          currentDeviceParams.userId,
        );

        if (!result) {
          console.log('RECORD_START_FAILED: startLocalRecord returned false');
          Alert.alert('Recording Failed', 'Stream is not ready. Please try again.');
          isRecordingRef.current = false;
          recordingHandleRef.current = null;
          setRecHandle(null);
          setIsRecording(false);
          setCurrentRecordInfo(null);
          return;
        }

        console.log('RECORD_START_SUCCESS');

        // SDK success — now update UI state
        isRecordingRef.current = true;
        recordingHandleRef.current = liveHandle;
        setRecHandle(liveHandle);
        setIsRecording(true);
        setRecordTimer(0);
        setCurrentRecordInfo({ fileName, path, thumbPath, channelId: chId });

        // Capture first frame as thumbnail
        setTimeout(() => {
          if (recordingHandleRef.current && currentDeviceParams.userId !== null && currentDeviceParams.userId !== undefined) {
            NvrSdk.captureSnapshotWithHandle(currentDeviceParams.userId, chId, thumbPath, recordingHandleRef.current).catch(() => { });
          }
        }, 800);
      } catch (e: any) {
        // Clean reset on failure
        isRecordingRef.current = false;
        recordingHandleRef.current = null;
        setRecHandle(null);
        setIsRecording(false);
        setCurrentRecordInfo(null);
        const msg = e?.message || String(e);
        console.log(`RECORD_START_FAILED: ${msg}`);
        Alert.alert('Recording Failed', 'Failed to start recording. Please try again.');
      }
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
    if (isGridSelectionVisible) setIsGridSelectionVisible(false);
    if (isChannelPanelVisible) setIsChannelPanelVisible(false);
    if (!showControls) {
      resetHideTimer();
    }
  };

  const handleCellPress = (index: number) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (
      lastTap.current &&
      lastTap.current.index === index &&
      now - lastTap.current.time < DOUBLE_TAP_DELAY
    ) {
      // Double tap detected - Toggle Fullscreen
      if (currentGrid !== '1x1') {
        // Store current state and go to 1x1
        const chId = gridCells[index];
        if (chId !== null) {
          setPreviousGridConfig({ type: currentGrid, cells: [...gridCells] });
          setCurrentGrid('1x1');
          setGridCells(prev => {
            const newCells = [...prev];
            newCells[0] = chId;
            return newCells;
          });
          setFocusedCellIndex(0);
          setActiveChannel(chId);
        }
      } else if (previousGridConfig) {
        // Restore previous grid
        setCurrentGrid(previousGridConfig.type);
        setGridCells(previousGridConfig.cells);
        setPreviousGridConfig(null);
        // Try to find the channel in the restored grid to keep focus
        const restoredIndex = previousGridConfig.cells.indexOf(activeChannel);
        if (restoredIndex !== -1) {
          setFocusedCellIndex(restoredIndex);
        }
        setSyncKey(prev => prev + 1); // Force refresh all players on restore
      }
      lastTap.current = null;
      return;
    }

    lastTap.current = { index, time: now };

    if (focusedCellIndex !== index) {
      // Disable previous audio explicitly if it was playing
      const prevChId = gridCells[focusedCellIndex];
      if (prevChId !== null && !isMuted) {
        NvrSdk.stopAudio(currentDeviceParams.userId, prevChId);
      }

      setFocusedCellIndex(index);
      const chId = gridCells[index];
      if (chId !== null) {
        setActiveChannel(chId);
        // Enable audio for newly selected channel if not muted
        if (!isMuted) {
          NvrSdk.startAudio(currentDeviceParams.userId, chId);
        }
      }

      setIsMuted(false); // Proactively ensure global unmute on manual selection

      if (!showControls) {
        setShowControls(true);
        resetHideTimer();
      }
    } else {
      toggleControls();
    }
  };

  const handleGridSelect = (grid: GridType) => {
    setCurrentGrid(grid);
    setIsGridSelectionVisible(false);

    // Auto-populate grid based on new layout
    const dev = allDevices.find(d => d.id === currentDeviceParams.deviceId);
    const maxCh = dev?.channels?.length || 16;
    const newCells = [...gridCells];

    // Starting channel from currently active channel
    const startChId = activeChannel !== undefined && activeChannel !== null ? activeChannel : 0;

    if (grid === '1x1') {
      newCells[0] = startChId;
    } else {
      const cellsCount = getGridCellCount(grid);
      for (let i = 0; i < cellsCount; i++) {
        newCells[i] = (startChId + i) % maxCh;
      }
    }
    setGridCells(newCells);
    setFocusedCellIndex(0);

    resetHideTimer();
  };

  const handleDeviceSelect = async (device: Device) => {
    setIsDeviceDropdownVisible(false);
    try {
      // Perform login for the new device in background
      const res = await NvrSdk.login({
        host: String(device.ip),
        port: parseInt(String(device.port)),
        username: device.nvrUsername || 'admin',
        password: device.nvrPassword || '123456',
        loginType: device.connectMode === 'P2P' ? 2 : 0,
        sn: device.deviceId || device.sn || '',
        protocol: device.protocol || 'TVT',
      });

      if (res.userId >= 0) {
        setCurrentDeviceParams({
          ...currentDeviceParams,
          userId: res.userId,
          deviceId: device.id,
          deviceName: device.name,
          ip: device.ip,
          nvrUsername: device.nvrUsername,
          nvrPassword: device.nvrPassword,
          type: device.type,
        });
        userIdRef.current = res.userId;
        setActiveChannel(0); // Reset to first channel of new device
        setFocusedCellIndex(0); // Reset focus

        const maxCh = device.channels?.length || 16;
        const newCells = [...gridCells];

        if (currentGrid === '1x1') {
          newCells[0] = 0;
        } else {
          const cellsCount = getGridCellCount(currentGrid);
          for (let i = 0; i < cellsCount; i++) {
            newCells[i] = i % maxCh;
          }
        }
        setGridCells(newCells);
      }
    } catch (e) {
      Alert.alert('Login Failed', `Could not connect to ${device.name}`);
    }
    resetHideTimer();
  };

  const goToPrevChannel = () => {
    const dev = allDevices.find(d => d.id === currentDeviceParams.deviceId);
    const maxCh = dev?.channels?.length || 16;
    const next = (activeChannel - 1 + maxCh) % maxCh;
    handleChannelSelect(next);
  };

  const goToNextChannel = () => {
    const dev = allDevices.find(d => d.id === currentDeviceParams.deviceId);
    const maxCh = dev?.channels?.length || 16;
    const next = (activeChannel + 1) % maxCh;
    handleChannelSelect(next);
  };

  const getGridCellCount = (grid: string) => {
    if (grid === '2x2') return 4;
    if (grid === '3x3') return 9;
    if (grid === '4x4') return 16;
    if (grid === '5x5') return 25;
    if (grid === '6x6') return 36;
    if (grid === '1+3') return 4;
    if (grid === '1+5') return 6;
    if (grid === '1+7') return 8;
    if (grid === '1+8') return 9;
    if (grid === '1+12') return 13;
    if (grid === '32') return 32;
    return 1;
  };

  const handleChannelSelect = (chIdRaw: any) => {
    const chId = typeof chIdRaw === 'string' ? parseInt(chIdRaw, 10) : chIdRaw;

    // Stop audio for current focused cell before switching
    const prevChId = gridCells[focusedCellIndex];
    if (prevChId !== null && !isMuted) {
      NvrSdk.stopAudio(currentDeviceParams.userId, prevChId);
    }

    setActiveChannel(chId);

    const dev = allDevices.find(d => d.id === currentDeviceParams.deviceId);
    const maxCh = dev?.channels?.length || 16;
    const newCells = [...gridCells];

    if (currentGrid === '1x1') {
      newCells[0] = chId;
    } else {
      const cellsCount = getGridCellCount(currentGrid);
      for (let i = 0; i < cellsCount; i++) {
        newCells[i] = (chId + i) % maxCh;
      }
    }

    setGridCells(newCells);
    // Always focus the first cell (which is the selected channel) and unmute
    setFocusedCellIndex(0);
    setIsMuted(false);

    // Start audio for the new primary channel
    NvrSdk.startAudio(currentDeviceParams.userId, chId);

    if (currentGrid === '1x1') {
      setIsChannelPanelVisible(false);
    }
    resetHideTimer();
  };

  const renderCell = (index: number) => {
    const chId = gridCells[index];
    const isCellFocused = focusedCellIndex === index;
    const cellStyles = [
      { flex: 1 },
      isCellFocused && { borderWidth: 2, borderColor: '#00BFFF' },
    ];

    if (chId === null && currentGrid === '1x1' && index === 0) {
      return (
        <TouchableOpacity
          activeOpacity={1}
          style={cellStyles}
          onPress={() => handleCellPress(index)}
        >
          <LivePlayer
            key={`player_${currentDeviceParams.deviceId}_${activeChannel}_${index}_${gridStreamTypes[index]}_${syncKey}`}
            userId={currentDeviceParams.userId}
            host={currentDeviceParams.ip}
            username={currentDeviceParams.nvrUsername || ''}
            password={currentDeviceParams.nvrPassword || ''}
            channelId={activeChannel}
            streamType={gridStreamTypes[index]}
            deviceType={currentDeviceParams.type}
            index={0}
            aspectRatio="16:9"
            muted={isMuted || !isCellFocused}
            onHandleAcquired={(idx, h) => {
              handlesRef.current[indexToKey(idx)] = h;
            }}
          />
          {isCellFocused && (
            <View style={styles.audioIndicator}>
              <Icon
                name={isMuted ? 'volume-off' : 'volume-high'}
                size={16}
                color={isMuted ? '#AAA' : '#00BFFF'}
              />
            </View>
          )}
          {isCellFocused && isRecording && (
            <View style={styles.recIndicator}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>
                REC{' '}
                {new Date(recordTimer * 1000).toISOString().substring(14, 19)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    if (chId === null || index >= loadingCellCount) {
      return (
        <TouchableOpacity
          activeOpacity={1}
          style={cellStyles}
          onPress={() => handleCellPress(index)}
        >
          <View style={styles.placeholder}>
            <Icon name="video-off-outline" size={30} color="#555" />
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={1}
        style={cellStyles}
        onPress={() => handleCellPress(index)}
      >
        {isScreenFocused ? (
          <LivePlayer
            key={`player_${currentDeviceParams.deviceId}_${chId}_${index}_${gridStreamTypes[index]}_${syncKey}`}
            userId={currentDeviceParams.userId}
            host={currentDeviceParams.ip}
            username={currentDeviceParams.nvrUsername || ''}
            password={currentDeviceParams.nvrPassword || ''}
            channelId={chId}
            streamType={gridStreamTypes[index]}
            deviceType={currentDeviceParams.type}
            index={index}
            aspectRatio="16:9"
            muted={isMuted || !isCellFocused}
            osdVisible={true}
            onHandleAcquired={(idx, h) => {
              handlesRef.current[indexToKey(idx)] = h;
            }}
          />
        ) : (
          <View style={styles.placeholder}>
            <Icon name="video-off-outline" size={30} color="#555" />
          </View>
        )}
        {isCellFocused && (
          <View style={styles.audioIndicator}>
            <Icon
              name={isMuted ? 'volume-off' : 'volume-high'}
              size={16}
              color={isMuted ? '#AAA' : '#00BFFF'}
            />
          </View>
        )}
        {isCellFocused && isRecording && (
          <View style={styles.recIndicator}>
            <View style={styles.recDot} />
            <Text style={styles.recText}>
              REC{' '}
              {new Date(recordTimer * 1000).toISOString().substring(14, 19)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderGridContent = () => {
    const borderStyle = { borderWidth: 0.5, borderColor: '#333' };
    switch (currentGrid) {
      case '1x1':
        return <View style={styles.gridFull}>{renderCell(0)}</View>;
      case '2x2':
        return (
          <View style={styles.gridRowWrap}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={styles.gridCell2x2}>
                {renderCell(i)}
              </View>
            ))}
          </View>
        );
      case '3x3':
        return (
          <View style={styles.gridRowWrap}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <View key={i} style={styles.gridCell3x3}>
                {renderCell(i)}
              </View>
            ))}
          </View>
        );
      case '4x4':
        return (
          <View style={styles.gridRowWrap}>
            {Array.from({ length: 16 }, (_, i) => i).map(i => (
              <View key={i} style={styles.gridCell4x4}>
                {renderCell(i)}
              </View>
            ))}
          </View>
        );
      case '5x5':
        return (
          <View style={styles.gridRowWrap}>
            {Array.from({ length: 25 }, (_, i) => i).map(i => (
              <View
                key={i}
                style={{ width: '20%', height: '20%', ...borderStyle }}
              >
                {renderCell(i)}
              </View>
            ))}
          </View>
        );
      case '6x6':
        return (
          <View style={styles.gridRowWrap}>
            {Array.from({ length: 36 }, (_, i) => i).map(i => (
              <View
                key={i}
                style={{ width: '16.66%', height: '16.66%', ...borderStyle }}
              >
                {renderCell(i)}
              </View>
            ))}
          </View>
        );
      case '1+3':
        return (
          <View style={styles.gridFull}>
            <View style={{ flex: 3, flexDirection: 'row' }}>
              <View style={{ flex: 3, ...borderStyle }}>{renderCell(0)}</View>
              <View style={{ flex: 1 }}>
                <View style={{ flex: 1, ...borderStyle }}>{renderCell(1)}</View>
                <View style={{ flex: 1, ...borderStyle }}>{renderCell(2)}</View>
                <View style={{ flex: 1, ...borderStyle }}>{renderCell(3)}</View>
              </View>
            </View>
          </View>
        );
      case '1+5':
        return (
          <View style={styles.gridFull}>
            <View style={{ flex: 2, flexDirection: 'row' }}>
              <View style={{ flex: 2, ...borderStyle }}>{renderCell(0)}</View>
              <View style={{ flex: 1 }}>
                <View style={{ flex: 1, ...borderStyle }}>{renderCell(1)}</View>
                <View style={{ flex: 1, ...borderStyle }}>{renderCell(2)}</View>
              </View>
            </View>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(3)}</View>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(4)}</View>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(5)}</View>
            </View>
          </View>
        );
      case '1+7':
        return (
          <View style={styles.gridFull}>
            <View style={{ flex: 3, flexDirection: 'row' }}>
              <View style={{ flex: 3, ...borderStyle }}>{renderCell(0)}</View>
              <View style={{ flex: 1 }}>
                <View style={{ flex: 1, ...borderStyle }}>{renderCell(1)}</View>
                <View style={{ flex: 1, ...borderStyle }}>{renderCell(2)}</View>
                <View style={{ flex: 1, ...borderStyle }}>{renderCell(3)}</View>
              </View>
            </View>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(4)}</View>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(5)}</View>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(6)}</View>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(7)}</View>
            </View>
          </View>
        );
      case '1+8':
        return (
          <View style={styles.gridFull}>
            <View style={{ flex: 3, flexDirection: 'row' }}>
              <View style={{ flex: 3, ...borderStyle }}>{renderCell(0)}</View>
              <View style={{ flex: 1 }}>
                <View style={{ flex: 1, ...borderStyle }}>{renderCell(1)}</View>
                <View style={{ flex: 1, ...borderStyle }}>{renderCell(2)}</View>
                <View style={{ flex: 1, ...borderStyle }}>{renderCell(3)}</View>
              </View>
            </View>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(4)}</View>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(5)}</View>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(6)}</View>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(7)}</View>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(8)}</View>
            </View>
          </View>
        );
      case '1+12':
        return (
          <View style={styles.gridFull}>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(1)}</View>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(2)}</View>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(3)}</View>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(4)}</View>
            </View>
            <View style={{ flex: 2, flexDirection: 'row' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flex: 1, ...borderStyle }}>{renderCell(5)}</View>
                <View style={{ flex: 1, ...borderStyle }}>{renderCell(6)}</View>
              </View>
              <View style={{ flex: 2, ...borderStyle }}>{renderCell(0)}</View>
              <View style={{ flex: 1 }}>
                <View style={{ flex: 1, ...borderStyle }}>{renderCell(7)}</View>
                <View style={{ flex: 1, ...borderStyle }}>{renderCell(8)}</View>
              </View>
            </View>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(9)}</View>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(10)}</View>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(11)}</View>
              <View style={{ flex: 1, ...borderStyle }}>{renderCell(12)}</View>
            </View>
          </View>
        );
      case '32':
        return (
          <View style={styles.gridRowWrap}>
            {Array.from({ length: 32 }, (_, i) => i).map(i => (
              <View
                key={i}
                style={{ width: '12.5%', height: '25%', ...borderStyle }}
              >
                {renderCell(i)}
              </View>
            ))}
          </View>
        );
      default:
        return <View style={styles.gridFull}>{renderCell(0)}</View>;
    }
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={toggleControls}>
        <View style={styles.videoContainer}>
          {renderGridContent()}

          {/* Visual Flash Overlay */}
          {showVisualFlash && (
            <View style={styles.flashOverlay} />
          )}

          {/* Media Success Toast Overlay */}
          {mediaToast && (
            <TouchableOpacity
              style={[styles.toastOverlay, { bottom: showControls ? 80 : 20 }]}
              activeOpacity={0.9}
              onPress={() => {
                setMediaToast(null);
                navigation.navigate('Gallery');
              }}
            >
              <View style={styles.toastContent}>
                <View style={styles.toastThumbContainer}>
                  <Image
                    source={{ uri: 'file://' + mediaToast.path }}
                    style={styles.toastThumb}
                    resizeMode="cover"
                  />
                </View>
                <Text style={styles.toastText}>
                  {mediaToast.type === 'picture'
                    ? 'The picture has been saved. Please click to view.'
                    : 'The video has been saved. Please click to view'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Top Overlay */}
          {showControls && (
            <View style={styles.topOverlay}>
              <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
                <Icon name="chevron-left" size={30} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.cameraName}>
                {currentDeviceParams.deviceName} - CH{activeChannel + 1}
              </Text>
              <View style={styles.topRightIcons}>
                <Text style={styles.dateText}>
                  {new Date().toLocaleDateString()}{' '}
                  {new Date().toLocaleTimeString()}
                </Text>
              </View>
            </View>
          )}

          {/* Right Side Icons */}
          {showControls && (
            <View style={styles.rightOverlay}>
              <TouchableOpacity
                style={styles.sideBtn}
                onPress={() => {
                  handleSnapshot();
                  resetHideTimer();
                }}
              >
                <Icon name="camera-outline" size={28} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sideBtn,
                  isRecording && { backgroundColor: '#FF5252' },
                ]}
                onPress={() => {
                  handleRecord();
                  resetHideTimer();
                }}
              >
                <Icon
                  name={isRecording ? 'stop' : 'video-outline'}
                  size={28}
                  color="#FFF"
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom Overlay Actions */}
          {showControls && (
            <View style={styles.bottomOverlay}>
              <View style={styles.bottomRow}>
                <TouchableOpacity
                  style={[
                    styles.bottomIcon,
                    isChannelPanelVisible && {
                      backgroundColor: 'rgba(168, 50, 50, 0.6)',
                    },
                  ]}
                  onPress={() => {
                    setIsChannelPanelVisible(!isChannelPanelVisible);
                    setIsGridSelectionVisible(false);
                    resetHideTimer();
                  }}
                >
                  <Icon name="file-video-outline" size={24} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.bottomIcon,
                    isGridSelectionVisible && {
                      backgroundColor: 'rgba(168, 50, 50, 0.6)',
                    },
                  ]}
                  onPress={() => {
                    setIsGridSelectionVisible(!isGridSelectionVisible);
                    setIsChannelPanelVisible(false);
                    resetHideTimer();
                  }}
                >
                  <Icon name="view-grid-outline" size={24} color="#FFF" />
                </TouchableOpacity>
                {/* <TouchableOpacity
                  style={styles.bottomIcon}
                  onPress={resetHideTimer}
                >
                  <Icon name="microphone-outline" size={24} color="#FFF" />
                </TouchableOpacity> */}
                <TouchableOpacity
                  style={styles.bottomIcon}
                  onPress={() => {
                    setIsMuted(!isMuted);
                    resetHideTimer();
                  }}
                >
                  <Icon
                    name={isMuted ? 'volume-off' : 'volume-high'}
                    size={24}
                    color="#FFF"
                  />
                </TouchableOpacity>
                {(() => {
                  const dev = allDevices.find(d => String(d.id) === String(currentDeviceParams.deviceId));
                  if (!dev || !dev.channels || dev.channels.length === 0) {
                    return (
                      <TouchableOpacity style={styles.bottomIcon}>
                        <MaterialCommunityIcons
                          name="camera-control"
                          size={26}
                          color="#FFF"
                        />
                      </TouchableOpacity>
                    );
                  }
                  const chObj = dev.channels.find((c: any) => (typeof c.id === 'string' ? parseInt(c.id) : c.id) === activeChannel);
                  const hasPtz = chObj?.ptz === true || chObj?.ptzSupport === true || chObj?.name?.toLowerCase().includes('ptz') || chObj?.name?.toLowerCase().includes('dome') || chObj?.name?.toLowerCase().includes('speed');
                  return hasPtz ? (
                    <TouchableOpacity style={styles.bottomIcon}>
                      <MaterialCommunityIcons
                        name="camera-control"
                        size={26}
                        color="#FFF"
                      />
                    </TouchableOpacity>
                  ) : null;
                })()}

                <View style={styles.spacer} />

                <TouchableOpacity
                  style={styles.hdBtn}
                  onPress={() => {
                    const newTypes = [...gridStreamTypes];
                    newTypes[focusedCellIndex] =
                      newTypes[focusedCellIndex] === 0 ? 1 : 0;
                    setGridStreamTypes(newTypes);
                    resetHideTimer();
                  }}
                >
                  <Text style={styles.hdText}>
                    {gridStreamTypes[focusedCellIndex] === 0 ? 'HD' : 'SD'}
                  </Text>
                </TouchableOpacity>

                {/* <TouchableOpacity
                  style={styles.bottomIcon}
                  onPress={resetHideTimer}
                >
                  <Icon name="tune" size={24} color="#FFF" />
                </TouchableOpacity> */}
                <TouchableOpacity
                  style={styles.bottomIcon}
                  onPress={() => {
                    resetHideTimer();
                    const targetChannelId =
                      gridCells[focusedCellIndex] !== null && gridCells[focusedCellIndex] !== undefined
                        ? gridCells[focusedCellIndex]
                        : (activeChannel !== null && activeChannel !== undefined ? activeChannel : 0);

                    navigation.navigate('Playback', {
                      deviceId: currentDeviceParams.deviceId,
                      deviceName: currentDeviceParams.deviceName,
                      initialChannelId: targetChannelId,
                      autoPlay: true,
                      initialFullscreen: true,
                    });
                  }}
                >
                  <Icon
                    name="play-box-multiple-outline"
                    size={24}
                    color="#FFF"
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Grid Selection Side Panel - DESIGN MATCH */}
          {isGridSelectionVisible && (
            <View style={styles.gridSidePanel}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  alignItems: 'center',
                  paddingVertical: 10,
                }}
              >
                {(
                  [
                    '1x1',
                    '2x2',
                    '3x3',
                    '4x4',
                    '5x5',
                    '6x6',
                    '1+3',
                    '1+5',
                    '1+7',
                    '1+8',
                    '1+12',
                    '32',
                  ] as GridType[]
                ).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.gridOption,
                      currentGrid === type && styles.gridOptionActive,
                    ]}
                    onPress={() => handleGridSelect(type)}
                  >
                    <GridIcon
                      type={type}
                      selected={currentGrid === type}
                      showLabel={false}
                      inactiveColor="#FFF"
                      activeColor="#FFF"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Channel Selection Panel - DESIGN MATCH */}
          {isChannelPanelVisible && (
            <View style={styles.channelSidePanel}>
              <View style={styles.channelPanelHeader}>
                <TouchableOpacity
                  style={styles.deviceIndicator}
                  onPress={() => {
                    setIsDeviceDropdownVisible(!isDeviceDropdownVisible);
                    resetHideTimer();
                  }}
                >
                  <Text style={styles.deviceNameText}>
                    {currentDeviceParams.deviceName}
                  </Text>
                  <Icon name="chevron-down" size={18} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerRightActions}>
                  <TouchableOpacity
                    style={styles.headerIcon}
                    onPress={goToPrevChannel}
                  >
                    <Icon
                      name="arrow-left-circle-outline"
                      size={24}
                      color="#FFF"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.headerIcon}
                    onPress={goToNextChannel}
                  >
                    <Icon
                      name="arrow-right-circle-outline"
                      size={24}
                      color="#FFF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Device Dropdown Overlay */}
              {isDeviceDropdownVisible && (
                <View style={styles.deviceDropdown}>
                  <ScrollView style={{ maxHeight: 200 }}>
                    {allDevices.map(dev => (
                      <TouchableOpacity
                        key={dev.id}
                        style={styles.deviceItem}
                        onPress={() => handleDeviceSelect(dev)}
                      >
                        <Text
                          style={[
                            styles.deviceItemText,
                            currentDeviceParams.deviceId === dev.id && {
                              color: '#00BFFF',
                            },
                          ]}
                        >
                          {dev.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.channelListContainer}
              >
                {Array.from(
                  {
                    length:
                      allDevices.find(
                        d => d.id === currentDeviceParams.deviceId,
                      )?.channels?.length || 16,
                  },
                  (_, i) => i,
                ).map(ch => (
                  <TouchableOpacity
                    key={ch}
                    style={[
                      styles.channelCircle,
                      activeChannel === ch && styles.channelCircleActive,
                    ]}
                    onPress={() => handleChannelSelect(ch)}
                  >
                    <Text
                      style={[
                        styles.channelNum,
                        activeChannel === ch && styles.channelNumActive,
                      ]}
                    >
                      {(ch + 1).toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 10,
  },
  cameraName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  topRightIcons: {
    flex: 1,
    alignItems: 'flex-end',
  },
  dateText: {
    color: '#FFF',
    fontSize: 14,
  },
  rightOverlay: {
    position: 'absolute',
    right: 20,
    top: '30%',
    gap: 20,
    zIndex: 10,
  },
  sideBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 5,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomIcon: {
    padding: 10,
  },
  spacer: {
    flex: 1,
  },
  hdBtn: {
    borderWidth: 1.5,
    borderColor: '#FFF',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginHorizontal: 15,
  },
  hdText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  audioIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 4,
    borderRadius: 4,
    zIndex: 5,
  },
  gridFull: { flex: 1 },
  gridRowWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#000',
  },
  gridCell2x2: {
    width: '50%',
    height: '50%',
    borderWidth: 0.5,
    borderColor: '#333',
  },
  gridCell3x3: {
    width: '33.33%',
    height: '33.33%',
    borderWidth: 0.5,
    borderColor: '#333',
  },
  gridCell4x4: {
    width: '25%',
    height: '25%',
    borderWidth: 0.5,
    borderColor: '#333',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridSidePanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 70, // Above bottom bar
    width: 70,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    zIndex: 20,
  },
  gridOption: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  gridOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  channelSidePanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 70,
    width: 280,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    zIndex: 30,
  },
  channelPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  deviceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deviceNameText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  headerIcon: {
    padding: 5,
  },
  channelListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 15,
    justifyContent: 'center',
  },
  channelCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelCircleActive: {
    backgroundColor: '#00BFFF', // Vibrant blue highlight as per screenshot
  },
  channelNum: {
    color: '#00BFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  channelNumActive: {
    color: '#FFF',
  },
  deviceDropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    zIndex: 40,
    maxHeight: 250,
  },
  deviceItem: {
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  deviceItemText: {
    color: '#FFF',
    fontSize: 14,
  },
  toastOverlay: {
    position: 'absolute',
    left: 20,
    width: 320,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastThumbContainer: {
    width: 50,
    height: 38,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 12,
    backgroundColor: '#111',
  },
  toastThumb: {
    width: '100%',
    height: '100%',
  },
  toastText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  recIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5252',
    marginRight: 6,
  },
  recText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default LandscapeLiveView;
