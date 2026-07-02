import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { PdfView, getPdfPageCount } from '../native/NvrSdk';

type HelpViewerRouteProp = RouteProp<RootStackParamList, 'HelpViewer'>;

const HelpViewer: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<HelpViewerRouteProp>();
    const { fileName, title = 'Help Manual' } = route.params;

    const [loading, setLoading] = useState(true);
    const [pageCount, setPageCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [isNativeSupported, setIsNativeSupported] = useState(true);

    useEffect(() => {
        const fetchPageCount = async () => {
            try {
                const count = await getPdfPageCount(fileName);
                if (count > 0) {
                    setPageCount(count);
                } else {
                    // Fallback to web browser if page count is 0 (i.e. native module not compiled yet)
                    setIsNativeSupported(false);
                }
            } catch (error) {
                console.error('Failed to get PDF page count:', error);
                setIsNativeSupported(false);
            } finally {
                setLoading(false);
            }
        };
        fetchPageCount();
    }, [fileName]);

    const handlePrevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < pageCount - 1) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const handleBrowserFallback = async () => {
        try {
            const { BASE_URL } = require('../utils/api');
            const helpUrl = BASE_URL.replace('/api', '/help.pdf');
            const { Linking } = require('react-native');
            await Linking.openURL(helpUrl);
        } catch (error) {
            Alert.alert('Help', 'Unable to open help URL in system browser.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {title}
                </Text>
                <View style={styles.headerRightPlaceholder} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#A83232" />
                        <Text style={styles.loadingText}>Loading PDF document...</Text>
                    </View>
                ) : !isNativeSupported ? (
                    <View style={styles.fallbackContainer}>
                        <Icon name="file-pdf-box" size={80} color="#A83232" style={styles.fallbackIcon} />
                        <Text style={styles.fallbackText}>
                            PDF Reader compilation is pending or not supported on this build.
                        </Text>
                        <Text style={styles.fallbackSubtext}>
                            Please recompile your native app with "react-native run-android" to enable in-app viewing.
                        </Text>
                        <TouchableOpacity
                            style={styles.fallbackButton}
                            onPress={handleBrowserFallback}
                        >
                            <Icon name="open-in-new" size={20} color="#FFF" style={styles.buttonIcon} />
                            <Text style={styles.fallbackButtonText}>Open in Browser</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.pdfWrapper}>
                        <PdfView
                            style={styles.pdfView}
                            fileName={fileName}
                            pageIndex={currentPage}
                        />
                    </View>
                )}
            </View>

            {/* Bottom Pagination Bar */}
            {isNativeSupported && pageCount > 0 && (
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={[styles.pageButton, currentPage === 0 && styles.disabledButton]}
                        onPress={handlePrevPage}
                        disabled={currentPage === 0}
                    >
                        <Icon name="chevron-left" size={24} color={currentPage === 0 ? '#CCC' : '#A83232'} />
                        <Text style={[styles.pageButtonText, currentPage === 0 && styles.disabledButtonText]}>Prev</Text>
                    </TouchableOpacity>

                    <Text style={styles.pageIndicator}>
                        Page {currentPage + 1} of {pageCount}
                    </Text>

                    <TouchableOpacity
                        style={[styles.pageButton, currentPage === pageCount - 1 && styles.disabledButton]}
                        onPress={handleNextPage}
                        disabled={currentPage === pageCount - 1}
                    >
                        <Text style={[styles.pageButtonText, currentPage === pageCount - 1 && styles.disabledButtonText]}>Next</Text>
                        <Icon name="chevron-right" size={24} color={currentPage === pageCount - 1 ? '#CCC' : '#A83232'} />
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E9ECEF',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1.5,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#212529',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 16,
    },
    headerRightPlaceholder: {
        width: 32,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6C757D',
    },
    pdfWrapper: {
        flex: 1,
        width: '100%',
        backgroundColor: '#E9ECEF',
    },
    pdfView: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    fallbackContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        textAlign: 'center',
    },
    fallbackIcon: {
        marginBottom: 16,
    },
    fallbackText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#495057',
        textAlign: 'center',
        marginBottom: 8,
    },
    fallbackSubtext: {
        fontSize: 14,
        color: '#6C757D',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    fallbackButton: {
        flexDirection: 'row',
        backgroundColor: '#A83232',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    buttonIcon: {
        marginRight: 8,
    },
    fallbackButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    bottomBar: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#E9ECEF',
    },
    pageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    pageButtonText: {
        fontSize: 16,
        color: '#A83232',
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },
    disabledButtonText: {
        color: '#CCC',
    },
    pageIndicator: {
        fontSize: 15,
        fontWeight: '500',
        color: '#495057',
    },
});

export default HelpViewer;
