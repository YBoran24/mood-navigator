
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { analyzePlaceMood } from '../../../services/aiService';
import { getPhotoUrl, Place, searchPlaces } from '../../../services/placesService';
import { addVisit, hasVisited, isFavorite, toggleFavorite, Visit } from '../../../services/storageService';

export const MapScreen = () => {
    const mapRef = useRef<MapView>(null);

    // Harita ve Konum State
    const [mapRegion, setMapRegion] = useState({
        latitude: 41.0082,
        longitude: 28.9784, // İstanbul default
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

    // Arama State
    const [searchText, setSearchText] = useState("");
    const [places, setPlaces] = useState<Place[]>([]);
    const [loadingPlaces, setLoadingPlaces] = useState(false);

    // UI State
    const [darkMode, setDarkMode] = useState(false);

    // AI Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [isFav, setIsFav] = useState(false);
    const [isVisited, setIsVisited] = useState(false);
    const [loadingAI, setLoadingAI] = useState(false);
    const [aiResult, setAiResult] = useState<{
        score: number;
        reason: string;
        suggestion: string;
        why_visit: string;
        crowd_status: string;
        ai_comment: string;
    } | null>(null);

    // Check-in Modal State
    const [checkInVisible, setCheckInVisible] = useState(false);
    const [checkInNote, setCheckInNote] = useState("");
    const [checkInRating, setCheckInRating] = useState(5);

    // Başlangıçta konumu al
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return;
            }
            let location = await Location.getCurrentPositionAsync({});
            setUserLocation(location);

            if (mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                }, 1000);
            }
        })();
    }, []);

    // Geri dönüldüğünde ziyaret durumunu güncellemek için
    useFocusEffect(
        React.useCallback(() => {
            // İleride haritadaki markerların rengini güncellemek için kullanılabilir
        }, [])
    );

    const handleSearch = async () => {
        if (!searchText.trim()) {
            Alert.alert("Uyarı", "Lütfen bir mekan arayın.");
            return;
        }

        Keyboard.dismiss();
        setLoadingPlaces(true);
        setPlaces([]);

        const result = await searchPlaces(searchText);

        setLoadingPlaces(false);

        if (result.success && result.data.length > 0) {
            setPlaces(result.data);

            setTimeout(() => {
                if (mapRef.current) {
                    const coordinates = result.data.map(p => p.location);
                    mapRef.current.fitToCoordinates(coordinates, {
                        edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
                        animated: true,
                    });
                }
            }, 500);

        } else {
            Alert.alert("Sonuç Yok", result.error || "Aradığınız kriterde mekan bulunamadı.");
        }
    };

    const handleMarkerPress = async (place: Place) => {
        setSelectedPlace(place);
        setModalVisible(true);
        setAiResult(null);
        setLoadingAI(true);
        setCheckInVisible(false); // Reset checkin modal

        // Statusleri kontrol et
        const favStatus = await isFavorite(place.id);
        const visitStatus = await hasVisited(place.id);
        setIsFav(favStatus);
        setIsVisited(visitStatus);

        const moodContext = "Genel Ziyaret";
        const result = await analyzePlaceMood(place.name, moodContext, place.formattedAddress, place.types);

        setAiResult(result);
        setLoadingAI(false);
    };

    const handleToggleFav = async () => {
        if (selectedPlace) {
            const newStatus = await toggleFavorite(selectedPlace);
            setIsFav(newStatus);
        }
    };

    const openCheckIn = () => {
        setCheckInVisible(true);
        setCheckInNote("");
        setCheckInRating(5);
    };

    const handleSaveCheckIn = async () => {
        if (!selectedPlace) return;

        const visit: Visit = {
            ...selectedPlace,
            visitedAt: new Date().toISOString(),
            note: checkInNote,
            rating: checkInRating
        };

        await addVisit(visit);
        setIsVisited(true);
        setCheckInVisible(false);
        setModalVisible(false);
        Alert.alert("Harika! ✨", "Anı defterine kaydedildi.");
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    initialRegion={mapRegion}
                    showsUserLocation={true}
                    customMapStyle={darkMode ? darkMapStyle : mapStyle}
                >
                    {places.map((place) => (
                        <Marker
                            key={place.id}
                            coordinate={place.location}
                            title={place.name}
                            description={place.formattedAddress}
                            onPress={() => handleMarkerPress(place)}
                        >
                            <View style={[
                                styles.markerContainer,
                                darkMode && { borderColor: '#fff', backgroundColor: '#2d3436' },
                                // Ziyaret edildiyse yeşil yapabilirdik ama şu an state marker bazlı değil genel.
                                // İleride places listesine visited bilgisi merge edilebilir.
                            ]}>
                                <Text style={styles.markerEmoji}>📍</Text>
                            </View>
                        </Marker>
                    ))}
                </MapView>

                {/* Arama */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={[styles.input, darkMode && { backgroundColor: '#2d3436', color: 'white' }]}
                        placeholder="Örn: Kadıköyde sessiz cafe..."
                        placeholderTextColor={darkMode ? '#b2bec3' : '#999'}
                        value={searchText}
                        onChangeText={setSearchText}
                        returnKeyType="search"
                        onSubmitEditing={handleSearch}
                    />
                    <TouchableOpacity
                        style={styles.searchButton}
                        onPress={handleSearch}
                        disabled={loadingPlaces}
                    >
                        {loadingPlaces ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Text style={styles.searchButtonText}>Ara</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Gece Modu */}
                <TouchableOpacity
                    style={[styles.themeBtn, darkMode && { backgroundColor: '#2d3436', borderColor: '#b2bec3', borderWidth: 1 }]}
                    onPress={() => setDarkMode(!darkMode)}
                >
                    <Text style={{ fontSize: 24 }}>{darkMode ? "☀️" : "🌙"}</Text>
                </TouchableOpacity>

            </View>

            {/* ANA MODAL */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    {/* Eğer Check-in modundaysak farklı bir view göster */}
                    {checkInVisible ? (
                        <View style={[styles.modalContent, darkMode && { backgroundColor: '#2d3436' }]}>
                            <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 20 }, darkMode && { color: 'white' }]}>
                                📍 Anı Oluştur
                            </Text>

                            <Text style={[styles.label, darkMode && { color: '#dfe6e9' }]}>Puanın (1-5)</Text>
                            <View style={styles.ratingRow}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity key={star} onPress={() => setCheckInRating(star)}>
                                        <Text style={{ fontSize: 30 }}>{star <= checkInRating ? "⭐" : "☆"}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.label, darkMode && { color: '#dfe6e9' }]}>Notun</Text>
                            <TextInput
                                style={[styles.noteInput, darkMode && { backgroundColor: '#636e72', color: 'white' }]}
                                placeholder="Burayla ilgili ne hatırlamak istersin?"
                                placeholderTextColor="#b2bec3"
                                value={checkInNote}
                                onChangeText={setCheckInNote}
                                multiline
                            />

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCheckIn}>
                                <Text style={styles.saveBtnText}>Kaydet</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={{ alignItems: 'center', marginTop: 15 }} onPress={() => setCheckInVisible(false)}>
                                <Text style={{ color: '#636e72' }}>İptal</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // Normal Mekan Detay Görünümü
                        <View style={[styles.modalContent, darkMode && { backgroundColor: '#2d3436' }]}>

                            {selectedPlace?.photos && selectedPlace.photos.length > 0 && (
                                <Image
                                    source={{ uri: getPhotoUrl(selectedPlace.photos[0].name, 600) || undefined }}
                                    style={styles.modalImage}
                                />
                            )}

                            <View style={styles.modalHeader}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.modalTitle, darkMode && { color: 'white' }]}>{selectedPlace?.name}</Text>
                                        {isVisited && <Text style={{ marginLeft: 5 }}>✅</Text>}
                                    </View>
                                    <Text style={[styles.addressText, darkMode && { color: '#dfe6e9' }]}>
                                        {selectedPlace?.rating ? `⭐ ${selectedPlace.rating} (${selectedPlace.userRatingCount || 0}) • ` : ''}
                                        {selectedPlace?.formattedAddress}
                                    </Text>
                                </View>

                                <TouchableOpacity onPress={handleToggleFav} style={styles.favBtn}>
                                    <Text style={{ fontSize: 28 }}>{isFav ? "❤️" : "🤍"}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Check-in Butonu */}
                            <TouchableOpacity style={styles.checkInBtn} onPress={openCheckIn}>
                                <Text style={styles.checkInText}>{isVisited ? "Ziyareti Güncelle 🖊️" : "Buradaydım! 📍"}</Text>
                            </TouchableOpacity>

                            <View style={[styles.divider, darkMode && { backgroundColor: '#636e72' }]} />

                            {loadingAI ? (
                                <View style={styles.aiLoading}>
                                    <ActivityIndicator size="large" color="#6C5CE7" />
                                    <Text style={styles.aiLoadingText}>Yapay Zeka Analiz Ediyor...</Text>
                                </View>
                            ) : aiResult ? (
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    {/* SKOR VE AI YORUMU */}
                                    <View style={styles.scoreContainer}>
                                        <Text style={[styles.scoreText, { color: aiResult.score >= 7 ? '#00b894' : '#e17055' }]}>
                                            {aiResult.score}<Text style={[styles.scoreTotal, darkMode && { color: '#b2bec3' }]}>/10</Text>
                                        </Text>
                                        <Text style={[styles.vibeText, darkMode && { color: '#dfe6e9' }]}>
                                            "{aiResult.ai_comment}"
                                        </Text>
                                    </View>

                                    {/* NEDEN GELMELİSİN */}
                                    <View style={[styles.infoBox, { borderLeftColor: '#0984e3' }, darkMode && { backgroundColor: '#f8f9fa' }]}>
                                        <Text style={[styles.infoLabel, { color: '#0984e3' }]}>✨ Neden Gelmelisin?</Text>
                                        <Text style={[styles.infoValue, darkMode && { color: '#2d3436' }]}>{aiResult.why_visit}</Text>
                                    </View>

                                    {/* DİNAMİK ÖNERİ */}
                                    <View style={[styles.infoBox, { borderLeftColor: '#e17055' }, darkMode && { backgroundColor: '#f8f9fa' }]}>
                                        <Text style={[styles.infoLabel, { color: '#e17055' }]}>💡 Öneri</Text>
                                        <Text style={[styles.infoValue, darkMode && { color: '#2d3436' }]}>{aiResult.suggestion}</Text>
                                    </View>

                                    {/* YOĞUNLUK DURUMU */}
                                    <View style={[styles.infoBox, { borderLeftColor: '#00b894' }, darkMode && { backgroundColor: '#f8f9fa' }]}>
                                        <Text style={[styles.infoLabel, { color: '#00b894' }]}>� Yoğunluk Durumu</Text>
                                        <Text style={[styles.infoValue, { fontWeight: 'bold' }, darkMode && { color: '#2d3436' }]}>
                                            {aiResult.crowd_status}
                                        </Text>
                                    </View>
                                </ScrollView>
                            ) : (
                                <Text style={darkMode && { color: 'white' }}>Bir hata oluştu.</Text>
                            )}

                            <TouchableOpacity
                                style={[styles.closeButton, darkMode && { backgroundColor: '#6C5CE7' }]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.closeButtonText}>Kapat</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>

        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f6fa'
    },
    mapContainer: {
        flex: 1,
        position: 'relative'
    },
    map: {
        width: '100%',
        height: '100%'
    },
    searchContainer: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    input: {
        flex: 1,
        backgroundColor: 'white',
        borderTopLeftRadius: 15,
        borderBottomLeftRadius: 15,
        paddingHorizontal: 20,
        height: 50,
        fontSize: 16,
        color: '#2d3436'
    },
    searchButton: {
        backgroundColor: '#6C5CE7',
        width: 80,
        borderTopRightRadius: 15,
        borderBottomRightRadius: 15,
        justifyContent: 'center',
        alignItems: 'center'
    },
    searchButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    themeBtn: {
        position: 'absolute',
        top: 110,
        right: 20,
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 30,
        elevation: 5,
        zIndex: 10
    },
    markerContainer: {
        backgroundColor: 'white',
        padding: 5,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#6C5CE7',
    },
    markerEmoji: {
        fontSize: 24
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        maxHeight: '90%',
        paddingBottom: 40,
        overflow: 'hidden'
    },
    modalImage: {
        width: '100%',
        height: 200,
        resizeMode: 'cover'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 10
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2d3436',
    },

    addressText: {
        color: '#636e72',
        fontSize: 14,
        marginTop: 5
    },
    favBtn: {
        padding: 10,
    },
    checkInBtn: {
        backgroundColor: '#fab1a0',
        marginHorizontal: 20,
        padding: 10,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 10
    },
    checkInText: {
        color: '#d63031',
        fontWeight: 'bold',
        fontSize: 14
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f2f6',
        marginHorizontal: 20,
        marginVertical: 10
    },
    aiLoading: {
        alignItems: 'center',
        padding: 30
    },
    aiLoadingText: {
        marginTop: 15,
        color: '#6C5CE7',
        fontWeight: '600'
    },
    scoreContainer: {
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 20
    },
    scoreText: {
        fontSize: 48,
        fontWeight: 'bold',
    },
    scoreTotal: {
        fontSize: 20,
        color: '#b2bec3',
        fontWeight: 'normal'
    },
    vibeText: {
        fontSize: 16,
        textAlign: 'center',
        color: '#2d3436',
        fontStyle: 'italic',
        lineHeight: 24,
        marginTop: 5
    },
    infoBox: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 15,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#6C5CE7',
        marginHorizontal: 20
    },
    infoLabel: {
        fontWeight: 'bold',
        color: '#2d3436',
        marginBottom: 5
    },
    infoValue: {
        color: '#636e72',
        fontSize: 15
    },
    closeButton: {
        backgroundColor: '#2d3436',
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 20,
        marginHorizontal: 20
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    // Check-in Specific
    label: {
        fontWeight: 'bold',
        color: '#2d3436',
        marginBottom: 10,
        marginTop: 10,
        marginHorizontal: 20
    },
    ratingRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20
    },
    noteInput: {
        backgroundColor: '#f1f2f6',
        borderRadius: 10,
        padding: 15,
        height: 100,
        textAlignVertical: 'top',
        marginHorizontal: 20,
        fontSize: 16
    },
    saveBtn: {
        backgroundColor: '#6C5CE7',
        padding: 15,
        marginHorizontal: 20,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 20
    },
    saveBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    }
});

// Minimalist Map Style
const mapStyle = [
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#746855" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{ "color": "#ffffff" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#e9efff" }]
    }
];

// Dark Mode Style
const darkMapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
    { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
    { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
    { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
    { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
    { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
    { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
    { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];