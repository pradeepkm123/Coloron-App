import * as NvrSdk from '../native/NvrSdk';

export interface OnvifDeviceInfo {
    success: boolean;
    ip: string;
    port: number;
    rtspPort: number;
    model: string;
    manufacturer: string;
    serialNumber: string;
    primaryStreamUrl: string;
    candidateUrls: string[];
    error?: string;
}

export const COMMON_RTSP_PATHS = [
    '/stream1',                             // Generic ONVIF Profile 1
    '/live/ch0',                            // Generic IPC
    '/onvif1',                              // Standard ONVIF Profile 1
    '/Streaming/Channels/101',              // Hikvision / HiLook
    '/cam/realmonitor?channel=1&subtype=0', // Dahua / CP PLUS
    '/h264Preview_01_main',                 // Reolink / ONVIF
    '/videoMain',                           // TP-Link Tapo
    '/ch0_0.264',                           // Xiongmai / XM
    '/axis-media/media.amp',                // Axis
    '/media/video1',                        // Vivotek
];

/**
 * Generate candidate RTSP stream URLs for an ONVIF camera
 */
export const generateRtspUrls = (
    ip: string,
    rtspPort: number = 554,
    username?: string,
    password?: string
): string[] => {
    const cleanIp = ip.trim();
    const cleanPort = rtspPort || 554;
    const auth = username
        ? `${encodeURIComponent(username.trim())}:${encodeURIComponent((password || '').trim())}@`
        : '';

    return COMMON_RTSP_PATHS.map(path => `rtsp://${auth}${cleanIp}:${cleanPort}${path}`);
};

/**
 * Perform ONVIF SOAP probe or port connectivity check
 */
export const verifyAndDiscoverOnvif = async (
    ip: string,
    port: number = 80,
    username: string = 'admin',
    password: string = ''
): Promise<OnvifDeviceInfo> => {
    const cleanIp = ip.trim();
    const webPort = port || 80;
    const rtspPort = 554;

    console.log(`[OnvifService] Probing ONVIF camera at ${cleanIp}:${webPort} (RTSP: ${rtspPort})...`);

    // 1. Check TCP reachability on ONVIF/Web port and RTSP port
    let webPortReachable = false;
    let rtspPortReachable = false;

    try {
        webPortReachable = await NvrSdk.checkConnect(cleanIp, webPort, 3000);
    } catch (e) {
        webPortReachable = false;
    }

    try {
        rtspPortReachable = await NvrSdk.checkConnect(cleanIp, rtspPort, 3000);
    } catch (e) {
        rtspPortReachable = false;
    }

    console.log(`[OnvifService] Reachability -> Web(${webPort}): ${webPortReachable}, RTSP(${rtspPort}): ${rtspPortReachable}`);

    // If neither port is reachable, return failure
    if (!webPortReachable && !rtspPortReachable) {
        return {
            success: false,
            ip: cleanIp,
            port: webPort,
            rtspPort,
            model: 'ONVIF Camera',
            manufacturer: 'Generic',
            serialNumber: cleanIp.replace(/\./g, ''),
            primaryStreamUrl: '',
            candidateUrls: [],
            error: `Could not connect to ${cleanIp}:${webPort} or RTSP port ${rtspPort}. Please check IP address and camera power.`
        };
    }

    // 2. Try fetching ONVIF Device Information via SOAP
    let manufacturer = 'Generic';
    let model = 'ONVIF Camera';
    let serialNumber = `ONVIF_${cleanIp.replace(/\./g, '_')}`;

    if (webPortReachable) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3000);

            const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <GetDeviceInformation xmlns="http://www.onvif.org/ver10/device/wsdl"/>
  </s:Body>
</s:Envelope>`;

            const res = await fetch(`http://${cleanIp}:${webPort}/onvif/device_service`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/soap+xml; charset=utf-8;',
                },
                body: soapBody,
                signal: controller.signal
            });

            clearTimeout(timer);

            if (res.ok) {
                const text = await res.text();
                const mfgMatch = text.match(/<[^:]*:?Manufacturer[^>]*>([^<]+)<\/[^:]*:?Manufacturer>/i);
                const modelMatch = text.match(/<[^:]*:?Model[^>]*>([^<]+)<\/[^:]*:?Model>/i);
                const snMatch = text.match(/<[^:]*:?SerialNumber[^>]*>([^<]+)<\/[^:]*:?SerialNumber>/i);

                if (mfgMatch && mfgMatch[1]) manufacturer = mfgMatch[1].trim();
                if (modelMatch && modelMatch[1]) model = modelMatch[1].trim();
                if (snMatch && snMatch[1]) serialNumber = snMatch[1].trim();

                console.log(`[OnvifService] Identified ONVIF device: ${manufacturer} ${model} (${serialNumber})`);
            }
        } catch (soapErr) {
            console.log('[OnvifService] SOAP GetDeviceInformation skipped or failed:', soapErr);
        }
    }

    // 3. Generate candidate URLs
    const candidateUrls = generateRtspUrls(cleanIp, rtspPort, username, password);
    const primaryStreamUrl = candidateUrls[0];

    return {
        success: true,
        ip: cleanIp,
        port: webPort,
        rtspPort,
        model,
        manufacturer,
        serialNumber,
        primaryStreamUrl,
        candidateUrls,
    };
};

