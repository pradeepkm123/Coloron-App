import { NativeModules } from 'react-native';

const { TVTSdkModule } = NativeModules;

export enum LoginType {
    TCP = 0,
    DOMAIN = 0,
    P2P = 1,
    P2P_2 = 2
}

export interface DeviceInfo {
    videoInputNum: number;
    audioInputNum: number;
    alarmInputNum: number;
    alarmOutputNum: number;
    deviceType: number;
}

export const TVTSdk = {
    initSDK: async (): Promise<string> => {
        return TVTSdkModule.initSDK();
    },

    loginDevice: async (
        ip: string,
        port: number,
        username: string,
        password: string,
        loginType: LoginType = LoginType.TCP,
        sn: string = '',
        isWifi: boolean = false
    ): Promise<number> => {
        return TVTSdkModule.loginDevice(ip, port, username, password, loginType, sn, isWifi);
    },

    getDeviceInfo: async (userId: number): Promise<DeviceInfo> => {
        return TVTSdkModule.getDeviceInfo(userId);
    },

    logout: async (userId: number): Promise<boolean> => {
        return TVTSdkModule.logout(userId);
    },

    enableAlarms: async (userId: number, channelId: number): Promise<boolean> => {
        return TVTSdkModule.enableSmartSubscrib(userId, channelId);
    },

    cleanup: async (): Promise<boolean> => {
        return TVTSdkModule.cleanup();
    }
};
