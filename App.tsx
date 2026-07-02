import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

// Import Navigation Types
import { RootStackParamList } from './src/types/navigation';

// --- Import Screens ---
import Flash from './src/screens/Flash';
import Home from './src/screens/Home';
import LandingPage from './src/screens/Landingpage';
import SignUp from './src/screens/SignUp';
import Login from './src/screens/Login';
import ForgotPassword from './src/screens/ForgotPassword';
import LiveView from './src/screens/LiveView';
import Playback from './src/screens/Playback';
import DeviceList from './src/screens/DeviceList';
import Gallery from './src/screens/Gallery';
import LanSearch from './src/screens/LanSearch';
import Events from './src/screens/Events';
import PushSettings from './src/screens/PushSettings';
import PushConfig from './src/screens/PushConfig';
import Notifications from './src/screens/Notifications';
import QRScanner from './src/screens/QRScanner';
import TestNativeBridge from './src/screens/TestNativeBridge';
import Local from './src/screens/Local';
import AddLicensePlate from './src/screens/AddLicensePlate';
import AddPerson from './src/screens/AddPerson';
import DatabaseList from './src/screens/DatabaseList';
import About from './src/screens/About';
import PrivacyPolicy from './src/screens/PrivacyPolicy';
import HelpViewer from './src/screens/HelpViewer';
import RemoteDeviceList from './src/screens/RemoteDeviceList';
import RemoteFunctionPanel from './src/screens/RemoteFunctionPanel';
import CameraManagement from './src/screens/CameraManagement';
import AddCameraOptions from './src/screens/AddCameraOptions';
import QuicklyAddCamera from './src/screens/QuicklyAddCamera';
import AddCameraManually from './src/screens/AddCameraManually';
import EditCamera from './src/screens/EditCamera';
import RecordMain from './src/screens/RecordMain';
import ModeSettings from './src/screens/ModeSettings';
import AdvancedRecordSettings from './src/screens/AdvancedRecordSettings';
import EventRecordingSettings from './src/screens/EventRecordingSettings';
import ScheduleRecordingSettings from './src/screens/ScheduleRecordingSettings';
import ViewRecordStatus from './src/screens/ViewRecordStatus';
import SystemMain from './src/screens/SystemMain';
import GeneralSettings from './src/screens/GeneralSettings';
import DateTimeSettings from './src/screens/DateTimeSettings';
import ViewLog from './src/screens/ViewLog';
import Reboot from './src/screens/Reboot';
import AlarmMain from './src/screens/AlarmMain';
import AlarmOutList from './src/screens/AlarmOutList';
import AlarmOutConfig from './src/screens/AlarmOutConfig';
import AlarmDisplayConfig from './src/screens/AlarmDisplayConfig';
import AlarmBuzzerConfig from './src/screens/AlarmBuzzerConfig';
import AlarmPushConfig from './src/screens/AlarmPushConfig';
import MotionAlarmList from './src/screens/MotionAlarmList';
import MotionAlarmConfig from './src/screens/MotionAlarmConfig';
import SensorAlarmList from './src/screens/SensorAlarmList';
import SensorAlarmConfig from './src/screens/SensorAlarmConfig';
import IPCOfflineList from './src/screens/IPCOfflineList';
import IPCOfflineConfig from './src/screens/IPCOfflineConfig';
import ExceptionAlarmList from './src/screens/ExceptionAlarmList';
import ExceptionAlarmConfig from './src/screens/ExceptionAlarmConfig';
import DiskMain from './src/screens/DiskMain';
import DiskManagement from './src/screens/DiskManagement';
import StorageModeSettings from './src/screens/StorageModeSettings';
import StorageGroupConfig from './src/screens/StorageGroupConfig';
import ViewDiskInfo from './src/screens/ViewDiskInfo';
import SMARTInfo from './src/screens/SMARTInfo';
import SMARTDetail from './src/screens/SMARTDetail';
import NetworkMain from './src/screens/NetworkMain';
import TCPIPConfig from './src/screens/TCPIPConfig';
import PPPoEConfig from './src/screens/PPPoEConfig';
import EmailConfig from './src/screens/EmailConfig';
import SNMPConfig from './src/screens/SNMPConfig';
import NATConfig from './src/screens/NATConfig';
import UPnPConfig from './src/screens/UPnPConfig';
import SubStreamSettings from './src/screens/SubStreamSettings';
import ViewNetworkStatus from './src/screens/ViewNetworkStatus';
import EthernetPortDetails from './src/screens/EthernetPortDetails';
import LandscapeLiveView from './src/screens/LandscapeLiveView';
import LocalRecordingPlayer from './src/screens/LocalRecordingPlayer';
import EventChannelSelection from './src/screens/EventChannelSelection';
import Profile from './src/screens/Profile';
import { setNavigationRef, useAlarmListener } from './src/services/AlarmService';
import { notificationService } from './src/services/NotificationService';
import { tvtAlarmNotificationService } from './src/services/TvtAlarmNotificationService';
import { useNavigationContainerRef } from '@react-navigation/native';
import { API_URL } from './src/config/api';
import { authStorage } from './src/utils/authStorage';
import NvrSdk from './src/native/NvrSdk';
import messaging from '@react-native-firebase/messaging';
import notifee, { AuthorizationStatus, AndroidImportance } from '@notifee/react-native';


const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  const navigationRef = useNavigationContainerRef();
  useAlarmListener(); // Start AI Monitoring automatically on boot
  
  React.useEffect(() => {
    // Initialize notification settings
    notificationService.init();
    tvtAlarmNotificationService.init();

    if (navigationRef.isReady()) {
      setNavigationRef(navigationRef);
      notificationService.setNavigationRef(navigationRef);
      tvtAlarmNotificationService.setNavigationRef(navigationRef);
      
      // Handle Initial Notification (Deep Linking from killed state)
      import('@notifee/react-native').then(({ default: notifee }) => {
        notifee.getInitialNotification().then(initial => {
          if (initial) {
            console.log('[App] App launched by notification:', initial.notification.data);
            const channelId = initial.notification.android?.channelId;
            if (channelId === 'vms_alarms') {
              tvtAlarmNotificationService.handleNotificationTap(initial.notification.data);
            } else {
              notificationService.handleNotificationTap(initial.notification.data);
            }
          }
        });
      });
    }
  }, [navigationRef]);

  // 🚀 Initialize Permissions and Notification Channels
  React.useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Request Permissions
        await messaging().requestPermission();
        await notifee.requestPermission();
        const settings = await notifee.getNotificationSettings();
        console.log('[App] Notification Authorization Status:', settings.authorizationStatus);

        // 2. Create Notification Channel for Alarms
        await notifee.createChannel({
          id: 'alarm-channel',
          name: 'ColorOn Alarm Notifications',
          importance: AndroidImportance.HIGH,
          sound: 'default',
        });
        console.log('[App] ✅ Alarm Channel Created');

        // 3. Sync Backend Config
        const user = await authStorage.getUser();
        const token = await authStorage.getToken();
        if (user && token) {
          // Temporarily removed: NvrSdk.setBackendConfig is not implemented natively yet
          // await NvrSdk.setBackendConfig(API_URL, token);
          console.log('[App] 🛡️ Backend config verified (native sync skipped)');
        }
      } catch (err) {
        console.warn('[App] Initialization error:', err);
      }
    };
    initApp();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#992828" translucent={false} />
      <NavigationContainer 
        ref={navigationRef} 
        onReady={() => {
          setNavigationRef(navigationRef);
          notificationService.setNavigationRef(navigationRef);
          tvtAlarmNotificationService.setNavigationRef(navigationRef);
          
          import('@notifee/react-native').then(({ default: notifee }) => {
            notifee.getInitialNotification().then(initial => {
              if (initial) {
                console.log('[App] App launched by notification (onReady):', initial.notification.data);
                const channelId = initial.notification.android?.channelId;
                if (channelId === 'vms_alarms') {
                  tvtAlarmNotificationService.handleNotificationTap(initial.notification.data);
                } else {
                  notificationService.handleNotificationTap(initial.notification.data);
                }
              }
            });
          });
        }}
      >
        <Stack.Navigator
          initialRouteName="Flash"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            screenOrientation: 'portrait'
          }}
        >
          {/* Main App Flow */}
          <Stack.Screen name="Flash" component={Flash} />
          <Stack.Screen name="LandingPage" component={LandingPage} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="SignUp" component={SignUp} />
          <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="LiveView" component={LiveView} />
          <Stack.Screen name="Playback" component={Playback} />
          <Stack.Screen name="DeviceList" component={DeviceList} />
          <Stack.Screen name="Gallery" component={Gallery} />
          <Stack.Screen name="LocalRecordingPlayer" component={LocalRecordingPlayer} />
          <Stack.Screen name="LanSearch" component={LanSearch} />
          <Stack.Screen name="Events" component={Events} />
          <Stack.Screen name="Notifications" component={Notifications} />
          <Stack.Screen name="QRScanner" component={QRScanner} />
          <Stack.Screen name="TestNativeBridge" component={TestNativeBridge} />
          <Stack.Screen name="Profile" component={Profile} />

          {/* User & Settings */}
          <Stack.Screen name="PushSettings" component={PushSettings} />
          <Stack.Screen name="EventChannelSelection" component={EventChannelSelection} /> 
          <Stack.Screen name="PushConfig" component={PushConfig} />
          <Stack.Screen name="Local" component={Local} />
          <Stack.Screen name="About" component={About} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
          <Stack.Screen name="HelpViewer" component={HelpViewer} />

          {/* Intelligent Features */}
          <Stack.Screen name="AddLicensePlate" component={AddLicensePlate} />
          <Stack.Screen name="AddPerson" component={AddPerson} />
          <Stack.Screen name="DatabaseList" component={DatabaseList} />

          {/* Remote Settings Hierarchy */}
          <Stack.Screen name="RemoteDeviceList" component={RemoteDeviceList} />
          <Stack.Screen name="RemoteFunctionPanel" component={RemoteFunctionPanel} />

          {/* Camera Management */}
          <Stack.Screen name="CameraManagement" component={CameraManagement} />
          <Stack.Screen name="AddCameraOptions" component={AddCameraOptions} />
          <Stack.Screen name="QuicklyAddCamera" component={QuicklyAddCamera} />
          <Stack.Screen name="AddCameraManually" component={AddCameraManually} />
          <Stack.Screen name="EditCamera" component={EditCamera} />

          {/* Record Settings */}
          <Stack.Screen name="RecordMain" component={RecordMain} />
          <Stack.Screen name="ModeSettings" component={ModeSettings} />
          <Stack.Screen name="AdvancedRecordSettings" component={AdvancedRecordSettings} />
          <Stack.Screen name="EventRecordingSettings" component={EventRecordingSettings} />
          <Stack.Screen name="ScheduleRecordingSettings" component={ScheduleRecordingSettings} />
          <Stack.Screen name="ViewRecordStatus" component={ViewRecordStatus} />

          {/* System Settings */}
          <Stack.Screen name="SystemMain" component={SystemMain} />
          <Stack.Screen name="GeneralSettings" component={GeneralSettings} />
          <Stack.Screen name="DateTimeSettings" component={DateTimeSettings} />
          <Stack.Screen name="ViewLog" component={ViewLog} />
          <Stack.Screen name="Reboot" component={Reboot} />

          {/* Alarm Configuration */}
          <Stack.Screen name="AlarmMain" component={AlarmMain} />
          <Stack.Screen name="AlarmOutList" component={AlarmOutList} />
          <Stack.Screen name="AlarmOutConfig" component={AlarmOutConfig} />
          <Stack.Screen name="AlarmDisplayConfig" component={AlarmDisplayConfig} />
          <Stack.Screen name="AlarmBuzzerConfig" component={AlarmBuzzerConfig} />
          <Stack.Screen name="AlarmPushConfig" component={AlarmPushConfig} />
          <Stack.Screen name="MotionAlarmList" component={MotionAlarmList} />
          <Stack.Screen name="MotionAlarmConfig" component={MotionAlarmConfig} />
          <Stack.Screen name="SensorAlarmList" component={SensorAlarmList} />
          <Stack.Screen name="SensorAlarmConfig" component={SensorAlarmConfig} />
          <Stack.Screen name="IPCOfflineList" component={IPCOfflineList} />
          <Stack.Screen name="IPCOfflineConfig" component={IPCOfflineConfig} />
          <Stack.Screen name="ExceptionAlarmList" component={ExceptionAlarmList} />
          <Stack.Screen name="ExceptionAlarmConfig" component={ExceptionAlarmConfig} />

          {/* Disk & Storage */}
          <Stack.Screen name="DiskMain" component={DiskMain} />
          <Stack.Screen name="DiskManagement" component={DiskManagement} />
          <Stack.Screen name="StorageModeSettings" component={StorageModeSettings} />
          <Stack.Screen name="StorageGroupConfig" component={StorageGroupConfig} />
          <Stack.Screen name="ViewDiskInfo" component={ViewDiskInfo} />
          <Stack.Screen name="SMARTInfo" component={SMARTInfo} />
          <Stack.Screen name="SMARTDetail" component={SMARTDetail} />

          {/* Network Configuration */}
          <Stack.Screen name="NetworkMain" component={NetworkMain} />
          <Stack.Screen name="TCPIPConfig" component={TCPIPConfig} />
          <Stack.Screen name="PPPoEConfig" component={PPPoEConfig} />
          <Stack.Screen name="EmailConfig" component={EmailConfig} />
          <Stack.Screen name="SNMPConfig" component={SNMPConfig} />
          <Stack.Screen name="NATConfig" component={NATConfig} />
          <Stack.Screen name="UPnPConfig" component={UPnPConfig} />
          <Stack.Screen name="SubStreamSettings" component={SubStreamSettings} />
          <Stack.Screen name="ViewNetworkStatus" component={ViewNetworkStatus} />
          <Stack.Screen name="EthernetPortDetails" component={EthernetPortDetails} />
          <Stack.Screen name="LandscapeLiveView" component={LandscapeLiveView} options={{ screenOrientation: 'landscape' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
