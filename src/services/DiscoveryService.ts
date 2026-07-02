import dgram from 'react-native-udp';
import { Buffer } from 'buffer';
import NetInfo from '@react-native-community/netinfo';

// Ensure Buffer is available globally
if (typeof (globalThis as any).Buffer === 'undefined') {
    (globalThis as any).Buffer = Buffer;
}

const DISCOVERY_MSG = `<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://schemas.xmlsoap.org/soap/envelope/"
xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery">
<e:Header>
<w:MessageID>uuid:88888888-8888-8888-8888-888888888888</w:MessageID>
<w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
<w:Action>
http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe
</w:Action>
</e:Header>
<e:Body>
<d:Probe>
<d:Types>dn:NetworkVideoTransmitter</d:Types>
</d:Probe>
</e:Body>
</e:Envelope>`;

export interface DiscoveredDevice {
    ip: string;
    port: number;
    serial: string;
    model: string;
    manufacturer: string;
    type: string;
}

// Robust fetch with custom timeout logic that works everywhere
const fetchWithTimeout = (url: string, options: any, timeoutMs: number): Promise<Response> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Timeout'));
        }, timeoutMs);

        fetch(url, options)
            .then(res => {
                clearTimeout(timer);
                resolve(res);
            })
            .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
    });
};

export const discoverCameras = (
    timeout: number = 3000,
    onDeviceFound?: (device: DiscoveredDevice) => void
): Promise<DiscoveredDevice[]> => {
    return new Promise(async (resolve) => {
        const devices: Map<string, DiscoveredDevice> = new Map();
        let isClosed = false;

        // Helper to report findings immediately
        const reportDevice = (device: DiscoveredDevice) => {
            if (!devices.has(device.ip)) {
                devices.set(device.ip, device);
                if (onDeviceFound) {
                    onDeviceFound(device);
                }
            }
        };

        // Start IP range scan in parallel with multicast
        const ipScanPromise = (async () => {
             try {
                let ipAddr = '';
                try {
                    const state = await NetInfo.fetch();
                    ipAddr = (state.details as any)?.ipAddress;
                } catch (e) {
                    console.log('[DiscoveryService] NetInfo fetch failed, checking native');
                }
        
                if (!ipAddr || ipAddr === '0.0.0.0' || ipAddr.startsWith('127.')) {
                    // Try native fallback
                    try {
                        const { getLocalIpAddress } = require('../native/NvrSdk');
                        ipAddr = await getLocalIpAddress();
                        console.log('[DiscoveryService] Native IP address detected:', ipAddr);
                    } catch (err) {
                        console.warn('[DiscoveryService] Native IP detection failed:', err);
                    }
                }

                if (!ipAddr || ipAddr === '0.0.0.0' || ipAddr.startsWith('127.')) {
                    console.log('[DiscoveryService] No valid IP address found for subnet scan.');
                    return [];
                }
        
                const baseIp = ipAddr.substring(0, ipAddr.lastIndexOf('.'));
                const ports = [80, 8000, 8899, 34567, 37777];
        
                // Scan in chunks
                const CHUNK_SIZE = 15;
                for (let i = 1; i < 255; i += CHUNK_SIZE) {
                    if (isClosed) break;
                    const chunkPromises: Promise<void>[] = [];
                    for (let j = i; j < i + CHUNK_SIZE && j < 255; j++) {
                        const targetIp = `${baseIp}.${j}`;
                        
                        // Skip self and router IPs
                        if (targetIp === ipAddr || j === 1 || j === 254) continue;
        
                        ports.forEach(port => {
                            chunkPromises.push(
                                fetchWithTimeout(`http://${targetIp}:${port}/onvif/device_service`, { method: 'HEAD' }, 400)
                                    .then(res => {
                                        // Any response from this endpoint means a camera web service exists
                                        const d: DiscoveredDevice = {
                                            ip: targetIp,
                                            port: port,
                                            serial: targetIp,
                                            model: port === 80 ? 'TVT Device' : `IP Camera (${port})`,
                                            manufacturer: 'Generic',
                                            type: 'HTTP'
                                        };
                                        reportDevice(d);
                                    })
                                    .catch(() => {
                                        // Fallback to root HTTP path if not ONVIF
                                        if (port === 80) {
                                            fetchWithTimeout(`http://${targetIp}:80/`, { method: 'GET' }, 350)
                                                .then(() => {
                                                    const d: DiscoveredDevice = {
                                                        ip: targetIp,
                                                        port: 80,
                                                        serial: targetIp,
                                                        model: 'TVT Device',
                                                        manufacturer: 'Generic',
                                                        type: 'HTTP'
                                                    };
                                                    reportDevice(d);
                                                })
                                                .catch(() => {});
                                        }
                                    })
                            );
                        });
                    }
                    await Promise.all(chunkPromises);
                }
        
             } catch (e) {
                 console.warn('[DiscoveryService] IP Range scan error:', e);
             }
             return Array.from(devices.values());
        })();

        const socket = dgram.createSocket({ type: 'udp4' }) as any;
        const DISCOVERY_PORT = 3702;
        const DISCOVERY_ADDRESS = '239.255.255.250';

        const closeSocket = async () => {
            if (isClosed) return;
            isClosed = true;
            try {
                socket.close();
            } catch (e) { }

            // Ensure IP scan finishes or is at least acknowledged
            await ipScanPromise;
            resolve(Array.from(devices.values()));
        };

        const timer = setTimeout(closeSocket, timeout);

        socket.on('error', (err: any) => {
            console.warn('[DiscoveryService] UDP Socket Error:', err);
        });

        socket.on('message', (msg: Buffer, rinfo: any) => {
            try {
                const xml = msg.toString();
                const getTagValue = (xml: string, tag: string) => {
                    const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`));
                    return match ? match[1] : '';
                };

                const xAddrs = getTagValue(xml, 'd:XAddrs') || getTagValue(xml, 'XAddrs');
                const scopes = getTagValue(xml, 'd:Scopes') || getTagValue(xml, 'Scopes');

                if (xAddrs) {
                    const urlMatch = xAddrs.match(/http:\/\/([^:/]+)(?::(\d+))?/);
                    if (urlMatch) {
                        const ip = urlMatch[1];
                        const port = urlMatch[2] ? parseInt(urlMatch[2]) : 80;

                        let model = 'ONVIF Camera';
                        let manufacturer = 'Generic';

                        const nameMatch = scopes.match(/onvif:\/\/www\.onvif\.org\/name\/([^ ]+)/);
                        if (nameMatch) {
                            try {
                                model = decodeURIComponent(nameMatch[1]).replace(/_/g, ' ');
                            } catch (e) { }
                        }

                        const hwMatch = scopes.match(/onvif:\/\/www\.onvif\.org\/hardware\/([^ ]+)/);
                        if (hwMatch) {
                            try {
                                const hw = decodeURIComponent(hwMatch[1]);
                                model = model === 'ONVIF Camera' ? hw : `${model} (${hw})`;
                            } catch (e) { }
                        }

                        const d: DiscoveredDevice = {
                            ip,
                            port,
                            serial: ip,
                            model,
                            manufacturer: manufacturer,
                            type: 'ONVIF'
                        };
                        reportDevice(d);
                        console.log(`[DiscoveryService] Discovered ONVIF device: ${ip}:${port}`);
                    }
                }
            } catch (e) {
                console.error('[DiscoveryService] Error parsing discovery message:', e);
            }
        });

        socket.on('listening', () => {
            try {
                socket.setBroadcast(true);
                socket.setMulticastTTL(128);
                try {
                    socket.addMembership(DISCOVERY_ADDRESS);
                } catch (e) { }

                const msgBuffer = Buffer.from(DISCOVERY_MSG);
                const sendProbe = () => {
                    if (isClosed) return;
                    // Multicast
                    socket.send(msgBuffer, 0, msgBuffer.length, DISCOVERY_PORT, DISCOVERY_ADDRESS, (err: any) => {
                        if (err) console.error('[DiscoveryService] UDP Multicast Send Error:', err);
                    });
                    // Direct Broadcast
                    socket.send(msgBuffer, 0, msgBuffer.length, DISCOVERY_PORT, '255.255.255.255', (err: any) => {
                        if (err) console.log('[DiscoveryService] UDP Broadcast Send Error:', err);
                    });
                };

                sendProbe();
                setTimeout(() => !isClosed && sendProbe(), 300); 
                setTimeout(() => !isClosed && sendProbe(), 800);
                setTimeout(() => !isClosed && sendProbe(), 1500);

            } catch (e) {
                console.error('[DiscoveryService] UDP Setup on listening failed:', e);
            }
        });

        try {
            socket.bind(0);
        } catch (e) {
            console.error('[DiscoveryService] UDP Bind failed:', e);
            const scannedDevices = await ipScanPromise;
            resolve(scannedDevices);
        }
    });
};
