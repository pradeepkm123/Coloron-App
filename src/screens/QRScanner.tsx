import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    Text,
    Dimensions,
    Alert,
    Platform,
    Animated,
    Easing,
    TextInput,
    ScrollView,
    SafeAreaView
} from 'react-native';
import { Camera } from 'react-native-camera-kit';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import GradientBackground from '../Component/GradientBackground';
import { launchImageLibrary } from 'react-native-image-picker';
import { scanFile } from '../native/NvrSdk';

const { width, height } = Dimensions.get('window');
const SCAN_SIZE = width * 0.7; // 70% of screen width

interface QRScannerProps {
    onClose?: () => void;
    onScanSuccess?: (data: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onClose, onScanSuccess }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [scanned, setScanned] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const scanAnim = React.useRef(new Animated.Value(0)).current;

    const [showPermissionModal, setShowPermissionModal] = useState(true);
    const [showDynamicCode, setShowDynamicCode] = useState(false);
    const [dynamicCode, setDynamicCode] = useState(['', '', '', '']);
    const inputs = React.useRef<(TextInput | null)[]>([]);

    useEffect(() => {
        const startAnimation = () => {
            scanAnim.setValue(0);
            Animated.loop(
                Animated.timing(scanAnim, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        };

        startAnimation();
    }, [scanAnim]);

    useEffect(() => {
        // Stop camera if permission modal or dynamic code is showing
        if (showPermissionModal || showDynamicCode) {
            setTorchOn(false);
        }
    }, [showPermissionModal, showDynamicCode]);

    const handleDynamicCodeChange = (text: string, index: number) => {
        const newCode = [...dynamicCode];
        newCode[index] = text;
        setDynamicCode(newCode);

        // Auto-focus next
        if (text && index < 3) {
            inputs.current[index + 1]?.focus();
        }

        // Check completion (mock verification)
        if (index === 3 && text) {
            // If all filled
            if (newCode.every(c => c !== '')) {
                verifyDynamicCode(newCode.join(''));
            }
        }
    };

    const verifyDynamicCode = (code: string) => {
        // Mock verification logic
        console.log("Verifying dynamic code:", code);
        setTimeout(() => {
            Alert.alert("Success", "Device verified and added successfully!", [
                { text: "OK", onPress: () => navigation.navigate('Home', { scannedSN: undefined }) }
            ]);
        }, 1000);
    };

    const onReadCode = (event: any) => {
        if (scanned || showPermissionModal || showDynamicCode) return;
        const code = event.nativeEvent?.codeStringValue;
        if (code) {
            processScannedCode(code);
        }
    };

    const processScannedCode = (code: string) => {
        setScanned(true);
        console.log("Scanned QR Code:", code);

        const requiresDynamic = code.includes("dynamic"); // Simplified check

        if (requiresDynamic) {
            setShowDynamicCode(true);
        } else {
            if (onScanSuccess) {
                onScanSuccess(code);
            } else {
                // @ts-ignore
                navigation.navigate('Home', { scannedSN: code });
            }
        }
    };

    const handleGalleryScan = async () => {
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                selectionLimit: 1,
            });

            if (result.didCancel || !result.assets || result.assets.length === 0) return;

            const uri = result.assets[0].uri;
            if (!uri) return;

            // Remove 'file://' prefix for native scan if needed
            const cleanUri = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
            const code = await scanFile(cleanUri);

            if (code) {
                processScannedCode(code);
            } else {
                Alert.alert("Scan Failed", "No registered device QR code found in this image.");
            }
        } catch (e) {
            console.error("Gallery scan error:", e);
            Alert.alert("Error", "Failed to scan image.");
        }
    };

    const handleBack = () => {
        if (showDynamicCode) {
            setShowDynamicCode(false);
            setScanned(false);
            setDynamicCode(['', '', '', '']);
            return;
        }
        if (onClose) onClose();
        else navigation.goBack();
    };

    // Permission Modal
    if (showPermissionModal) {
        return (
            <View style={styles.permissionContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="#rgba(0,0,0,0.5)" translucent />
                <View style={styles.permissionModal}>
                    <Text style={styles.permissionText}>
                        The app is about to apply for Camera Permissions, used to add device by QR code
                    </Text>
                    <View style={styles.permissionButtons}>
                        <TouchableOpacity
                            style={styles.permissionBtn}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.permissionBtnTextCancel}>Don't agree</Text>
                        </TouchableOpacity>
                        <View style={styles.permissionDivider} />
                        <TouchableOpacity
                            style={styles.permissionBtn}
                            onPress={() => setShowPermissionModal(false)}
                        >
                            <Text style={styles.permissionBtnTextAgree}>Agree</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    // Dynamic Code Screen
    if (showDynamicCode) {
        return (
            <View style={styles.dynamicContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
                <GradientBackground>
                    <SafeAreaView style={styles.safeArea}>
                        {/* Standard App Header */}
                        <View style={styles.headerStandard}>
                            <TouchableOpacity style={styles.backButtonStandard} onPress={handleBack}>
                                <Icon name="arrow-left" size={26} color="#333" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitleStandard}>Verification Code</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        <ScrollView contentContainerStyle={styles.dynamicContent} showsVerticalScrollIndicator={false}>
                            <View style={styles.illustrationContainer}>
                                <Icon name="shield-check-outline" size={80} color="#9a2a33ff" />
                            </View>

                            <Text style={styles.dynamicMainTitle}>Enter Dynamic Code</Text>
                            <Text style={styles.dynamicDescription}>
                                Please enter the 4-digit verification code displayed on your device's screen or provided by the administrator.
                            </Text>

                            <View style={styles.codeInputsContainer}>
                                {dynamicCode.map((digit, index) => (
                                    <View key={index} style={[
                                        styles.codeInputWrapper,
                                        dynamicCode[index] ? styles.activeInputWrapper : null
                                    ]}>
                                        <TextInput
                                            ref={ref => { inputs.current[index] = ref; }}
                                            style={styles.codeInput}
                                            value={digit}
                                            onChangeText={(text) => handleDynamicCodeChange(text, index)}
                                            keyboardType="number-pad"
                                            maxLength={1}
                                            textAlign="center"
                                            autoFocus={index === 0}
                                            placeholder="0"
                                            placeholderTextColor="#DDD"
                                        />
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.confirmButton,
                                    dynamicCode.every(c => c !== '') ? styles.confirmButtonActive : styles.confirmButtonDisabled
                                ]}
                                onPress={() => verifyDynamicCode(dynamicCode.join(''))}
                                disabled={!dynamicCode.every(c => c !== '')}
                            >
                                <Text style={styles.confirmButtonText}>Verify & Add Device</Text>
                            </TouchableOpacity>

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </SafeAreaView>
                </GradientBackground>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="black" translucent />

            <Camera
                scanBarcode={true}
                onReadCode={onReadCode}
                style={styles.camera}
                torchMode={torchOn ? 'on' : 'off'}
            />

            {/* Overlay Container */}
            <View style={styles.overlayContainer}>
                {/* Top Mask */}
                <View style={styles.maskRow} />

                {/* Middle Row (Left Mask, Scan Window, Right Mask) */}
                <View style={styles.maskMiddle}>
                    <View style={styles.maskCol} />
                    <View style={styles.scanWindow}>
                        {/* Corner Markers */}
                        <View style={[styles.corner, styles.topLeft]} />
                        <View style={[styles.corner, styles.topRight]} />
                        <View style={[styles.corner, styles.bottomLeft]} />
                        <View style={[styles.corner, styles.bottomRight]} />

                        {/* Scanning Animation Line */}
                        <Animated.View
                            style={[
                                styles.scanLine,
                                {
                                    transform: [{
                                        translateY: scanAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, SCAN_SIZE]
                                        })
                                    }]
                                }
                            ]}
                        />
                    </View>
                    <View style={styles.maskCol} />
                </View>

                {/* Bottom Mask */}
                <View style={styles.maskRow} />
            </View>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Icon name="arrow-left" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan QR Code</Text>
                <TouchableOpacity style={styles.helpButton} onPress={() => Alert.alert("Help", "Align the QR code within the frame to scan.")}>
                    <Icon name="help-circle-outline" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomOverlay}>
                <Text style={styles.hintText}>Scan any QR code to add device</Text>

                <View style={styles.bottomControls}>
                    <TouchableOpacity style={styles.controlBtn} onPress={handleGalleryScan}>
                        <View style={styles.controlIconCircle}>
                            <Icon name="image-outline" size={24} color="#FFF" />
                        </View>
                        <Text style={styles.controlLabel}>Gallery</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.controlBtn} onPress={() => setTorchOn(!torchOn)}>
                        <View style={[styles.controlIconCircle, torchOn && styles.activeControl]}>
                            <Icon name={torchOn ? "flashlight" : "flashlight-off"} size={24} color={torchOn ? "#000" : "#FFF"} />
                        </View>
                        <Text style={styles.controlLabel}>Flash</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    /* Permission Modal Styles */
    permissionContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40
    },
    permissionModal: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        width: '100%',
        overflow: 'hidden'
    },
    permissionText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        padding: 24,
        paddingBottom: 30,
        lineHeight: 24
    },
    permissionButtons: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        height: 50
    },
    permissionBtn: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    permissionDivider: {
        width: 1,
        backgroundColor: '#EEE'
    },
    permissionBtnTextCancel: {
        color: '#00B0FF',
        fontSize: 16,
        fontWeight: '500'
    },
    permissionBtnTextAgree: {
        color: '#00B0FF',
        fontSize: 16,
        fontWeight: 'bold'
    },

    /* Standard App Header Styles (Consistent with LanSearch) */
    safeArea: {
        flex: 1,
    },
    headerStandard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 50,
        backgroundColor: 'transparent',
    },
    backButtonStandard: {
        padding: 5,
    },
    headerTitleStandard: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },

    /* Modern Dynamic Code Styles */
    dynamicContainer: {
        flex: 1,
        backgroundColor: '#FFF'
    },
    dynamicContent: {
        flexGrow: 1,
        padding: 30,
        alignItems: 'center',
        paddingTop: 30
    },
    illustrationContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#fff0f3ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    dynamicMainTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#9a2a33ff',
        marginBottom: 10
    },
    dynamicDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 20,
        paddingHorizontal: 10
    },
    codeInputsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 50
    },
    codeInputWrapper: {
        width: 60,
        height: 70,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        backgroundColor: '#F9F9F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeInputWrapper: {
        borderColor: '#7e1a26ff',
        backgroundColor: '#FFF',
        elevation: 3,
        shadowColor: '#7e1a22ff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    codeInput: {
        width: '100%',
        height: '100%',
        fontSize: 28,
        fontWeight: 'bold',
        color: '#7e1a1aff'
    },
    confirmButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    confirmButtonActive: {
        backgroundColor: '#A83232', // Brand Red
    },
    confirmButtonDisabled: {
        backgroundColor: '#E0E0E0',
    },
    confirmButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold'
    },
    resendContainer: {
        marginTop: 30
    },
    resendText: {
        fontSize: 14,
        color: '#666'
    },
    resendLink: {
        color: '#A83232',
        fontWeight: 'bold'
    },

    /* Existing Camera Styles */
    camera: {
        flex: 1,
        ...StyleSheet.absoluteFillObject
    },
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    maskRow: {
        flex: 1,
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    maskMiddle: {
        flexDirection: 'row',
        height: SCAN_SIZE,
    },
    maskCol: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    scanWindow: {
        width: SCAN_SIZE,
        height: SCAN_SIZE,
        backgroundColor: 'transparent',
        position: 'relative',
        overflow: 'hidden',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: '#ffffffff', // Brand Color or PhonePe Purple (#5f259f)
        borderWidth: 4,
    },
    topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },

    scanLine: {
        position: 'absolute',
        width: '100%',
        height: 2,
        backgroundColor: '#ffffffff', // Red laser line
        top: 0,
        opacity: 0.6
    },

    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: Platform.OS === 'ios' ? 50 : 40,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
        backgroundColor: 'transparent' // PhonePe often has transparent header on camera
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowRadius: 5
    },
    backButton: { padding: 8 },
    helpButton: { padding: 8 },

    bottomOverlay: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10
    },
    hintText: {
        color: '#FFF',
        fontSize: 16,
        marginBottom: 40,
        opacity: 0.9,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowRadius: 3
    },
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'center', // Center aligned or space-around
        width: '100%',
        paddingHorizontal: 50
    },
    controlBtn: {
        alignItems: 'center',
        marginHorizontal: 30
    },
    controlIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    activeControl: {
        backgroundColor: '#FFF'
    },
    controlLabel: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '500'
    }
});

export default QRScanner;
