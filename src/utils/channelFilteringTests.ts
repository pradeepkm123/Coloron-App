/**
 * NVR Channel Filtering - Test Examples
 * 
 * Use these examples to verify channel filtering is working correctly.
 * You can run these in your React Native debugger console or add them to your code temporarily.
 */

import { deviceStorage, Channel, Device } from '../utils/deviceStorage';

// ==============================================
// TEST 1: Basic Filtering - 16 Channel NVR with 8 Cameras
// ==============================================
export const testBasicFiltering = () => {
    console.log('🧪 TEST 1: Basic Filtering\n');

    // Simulate 16-channel NVR response from backend
    const nvrChannels: Channel[] = [
        // Connected cameras (8)
        { id: 0, name: 'Main Entrance', online: true },
        { id: 1, name: 'Back Door', online: true },
        { id: 2, name: 'Parking Lot', online: true },
        { id: 4, name: 'Reception', online: true },
        { id: 6, name: 'Hallway', online: true },
        { id: 8, name: 'Server Room', online: true },
        { id: 10, name: 'Emergency Exit', online: true },
        { id: 12, name: 'Loading Bay', online: true },

        // Empty slots (8) - should be filtered out
        { id: 3, name: 'Camera 4', online: false },
        { id: 5, name: 'Camera 6', online: false },
        { id: 7, name: 'Camera 8', online: false },
        { id: 9, name: 'Camera 10', online: false },
        { id: 11, name: 'Camera 12', online: false },
        { id: 13, name: 'Camera 14', online: false },
        { id: 14, name: 'Camera 15', online: false },
        { id: 15, name: 'Camera 16', online: false },
    ];

    const filtered = deviceStorage.filterConnectedChannels(nvrChannels);

    console.log(`Total Channels: ${nvrChannels.length}`);
    console.log(`Connected Channels: ${filtered.length}`);
    console.log(`Filtered Out: ${nvrChannels.length - filtered.length}`);
    console.log('✅ Expected: 8 connected, 8 filtered out\n');

    return filtered.length === 8;
};

// ==============================================
// TEST 2: Custom Names - Offline Camera with Custom Name
// ==============================================
export const testCustomNames = () => {
    console.log('🧪 TEST 2: Custom Name Filtering\n');

    const channels: Channel[] = [
        { id: 0, name: 'Front Gate', online: false },     // ✅ Keep (custom name)
        { id: 1, name: 'Camera 2', online: false },       // ❌ Remove (default name, offline)
        { id: 2, name: 'CH3', online: false },           // ❌ Remove (default pattern)
        { id: 3, name: 'Security Desk', online: true },   // ✅ Keep (online)
    ];

    const filtered = deviceStorage.filterConnectedChannels(channels);

    console.log('✅ Should keep: "Front Gate" (custom name even though offline)');
    console.log('✅ Should keep: "Security Desk" (online)');
    console.log('❌ Should remove: "Camera 2" (default name, offline)');
    console.log('❌ Should remove: "CH3" (default pattern, offline)\n');
    console.log(`Result: ${filtered.length} channels kept`);

    return filtered.length === 2;
};

// ==============================================
// TEST 3: Stream URL / IP Address
// ==============================================
export const testStreamAndIP = () => {
    console.log('🧪 TEST 3: Stream URL / IP Filtering\n');

    const channels: Channel[] = [
        {
            id: 0,
            name: 'Camera 1',
            online: false,
            streamUrl: 'rtsp://192.168.1.101/stream'
        }, // ✅ Keep (has stream)
        {
            id: 1,
            name: 'Camera 2',
            online: false,
            ip: '192.168.1.102'
        }, // ✅ Keep (has IP)
        {
            id: 2,
            name: 'Camera 3',
            online: false
        }, // ❌ Remove (no stream, no IP, offline)
    ];

    const filtered = deviceStorage.filterConnectedChannels(channels);

    console.log('Result:', filtered.map(ch => ch.name));
    console.log(`✅ Expected: 2 channels (Camera 1, Camera 2)\n`);

    return filtered.length === 2;
};

// ==============================================
// TEST 4: Enabled/Disabled Flag
// ==============================================
export const testEnabledFlag = () => {
    console.log('🧪 TEST 4: Enabled Flag\n');

    const channels: Channel[] = [
        { id: 0, name: 'Camera 1', online: true, enabled: true },   // ✅ Keep
        { id: 1, name: 'Camera 2', online: true, enabled: false },  // ❌ Remove (disabled)
        { id: 2, name: 'Camera 3', online: false, enabled: true },  // ✅ Keep (enabled)
        { id: 3, name: 'Camera 4', online: false },                 // ❌ Remove (no criteria)
    ];

    const filtered = deviceStorage.filterConnectedChannels(channels);

    console.log('✅ Camera 1: online + enabled');
    console.log('❌ Camera 2: online but DISABLED');
    console.log('✅ Camera 3: offline but ENABLED');
    console.log('❌ Camera 4: no valid criteria\n');
    console.log(`Result: ${filtered.length} channels`);

    return filtered.length === 2;
};

// ==============================================
// TEST 5: Full NVR Expansion
// ==============================================
export const testFullExpansion = () => {
    console.log('🧪 TEST 5: Full NVR Device Expansion\n');

    const testDevices: Device[] = [
        {
            id: 'nvr_001',
            name: 'Office NVR',
            type: 'NVR',
            ip: '192.168.1.100',
            port: '8000',
            status: 'Online',
            favorite: false,
            isNVR: true,
            channels: [
                { id: 0, name: 'Entrance', online: true },
                { id: 1, name: 'Camera 2', online: false },  // Will be filtered
                { id: 2, name: 'Parking', online: true },
            ]
        },
        {
            id: 'ipc_001',
            name: 'Front Door Camera',
            type: 'IPC',
            ip: '192.168.1.101',
            port: '554',
            status: 'Online',
            favorite: false,
        }
    ];

    const expanded = deviceStorage.expandNVRDevices(testDevices);

    console.log('Original Devices:', testDevices.length);
    console.log('After Expansion:', expanded.length);
    console.log('✅ Expected: 3 devices (2 NVR cameras + 1 standalone IPC)\n');

    expanded.forEach(d => {
        console.log(`- ${d.name} (${d.type})`);
    });

    return expanded.length === 3;
};

// ==============================================
// RUN ALL TESTS
// ==============================================
export const runAllTests = () => {
    console.log('🚀 Running All Channel Filtering Tests\n');
    console.log('='.repeat(50) + '\n');

    const results = {
        test1: testBasicFiltering(),
        test2: testCustomNames(),
        test3: testStreamAndIP(),
        test4: testEnabledFlag(),
        test5: testFullExpansion(),
    };

    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS:');
    console.log('='.repeat(50));

    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });

    const allPassed = Object.values(results).every(r => r === true);
    console.log('\n' + (allPassed ? '🎉 ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'));

    return allPassed;
};

// ==============================================
// USAGE IN YOUR APP
// ==============================================

/**
 * Example: Add to your Home.tsx or LiveView.tsx temporarily to test
 * 
 * import { runAllTests } from '../utils/channelFilteringTests';
 * 
 * useEffect(() => {
 *     runAllTests();
 * }, []);
 */

/**
 * Example: Check your real NVR data
 * 
 * const checkMyNVR = async () => {
 *     const devices = await deviceStorage.getDevices();
 *     const nvr = devices.find(d => d.isNVR);
 *     
 *     if (nvr && nvr.channels) {
 *         console.log('Total NVR Channels:', nvr.channels.length);
 *         
 *         const connected = deviceStorage.filterConnectedChannels(nvr.channels);
 *         console.log('Connected Cameras:', connected.length);
 *         console.log('Filtered Out (Empty Slots):', nvr.channels.length - connected.length);
 *         
 *         connected.forEach(ch => {
 *             console.log(`- ${ch.name} (${ch.online ? 'Online' : 'Offline'})`);
 *         });
 *     }
 * };
 */
