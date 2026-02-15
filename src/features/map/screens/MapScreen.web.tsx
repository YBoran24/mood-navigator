import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { analyzePlaceMood } from '../../../services/aiService';
import { Place, searchPlaces } from '../../../services/placesService';

const MOODS = [
    { id: 'huzur', label: '😌 Huzur', color: '#6C5CE7' },
    { id: 'calisma', label: '💻 Çalışma', color: '#0984E3' },
    { id: 'sohbet', label: '☕️ Sohbet', color: '#E17055' },
    { id: 'eglence', label: '🎉 Eğlence', color: '#FD79A8' },
    { id: 'romantik', label: '❤️ Romantik', color: '#e84393' },
];

export const MapScreen = () => {
    const [selectedMood, setSelectedMood] = useState('sohbet');
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [places, setPlaces] = useState<Place[]>([]);
    const [loadingPlaces, setLoadingPlaces] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    // AI State
    const [loadingAI, setLoadingAI] = useState(false);
    const [aiResult, setAiResult] = useState<{ score: number; reason: string; drink?: string; tip?: string } | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

    // 1. Konum İzni ve Alma
    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('İzin Hatası', 'Konum izni verilmedi. Varsayılan konum (İstanbul) kullanılıyor.');
                    setLocation({ coords: { latitude: 41.0082, longitude: 28.9784 } } as any);
                    return;
                }

                // 5 Saniyelik Zaman Aşımı (Timeout)
                const locationPromise = Location.getCurrentPositionAsync({});
                const timeoutPromise = new Promise((resolve, reject) =>
                    setTimeout(() => reject(new Error("Timeout")), 5000)
                );

                try {
                    let loc = await Promise.race([locationPromise, timeoutPromise]) as Location.LocationObject;
                    setLocation(loc);
                } catch (err) {
                    console.log("Konum alma zaman aşımına uğradı, varsayılan konum kullanılıyor.");
                    setLocation({ coords: { latitude: 41.0082, longitude: 28.9784 } } as any);
                }

            } catch (error) {
                console.error("Konum hatası:", error);
                setLocation({ coords: { latitude: 41.0082, longitude: 28.9784 } } as any);
            }
        })();
    }, []);

    // 2. Mekanları Getir (Konum veya Mood değişince)
    useEffect(() => {
        (async () => {
            if (!location) return;

            setLoadingPlaces(true);
            setLastError(null);

            const moodLabel = MOODS.find(m => m.id === selectedMood)?.label.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ ]/g, "").trim() || selectedMood;

            // Konuma göre dinamik arama sorgusu oluştur
            // Not: Web'de tam konum yerine genel bir arama metni kullanıyoruz
            const query = `${moodLabel} mekanlar İstanbul`; // Basitlik için İstanbul ekledik, kullanıcı konumuna göre reverse geocoding eklenebilir

            const result = await searchPlaces(query);

            if (result.success) {
                setPlaces(result.data);
            } else {
                setPlaces([]);
                setLastError(result.error || "Bilinmeyen hata");
            }

            setLoadingPlaces(false);
        })();
    }, [location, selectedMood]);

    const handlePress = async (place: Place) => {
        if (loadingAI) return;

        setSelectedPlace(place);
        setModalVisible(true);
        setAiResult(null);
        setLoadingAI(true);

        try {
            const result = await analyzePlaceMood(place.name, MOODS.find(m => m.id === selectedMood)?.label || selectedMood, place.formattedAddress);
            setAiResult(result);
        } catch (error) {
            setAiResult({ score: 0, reason: "Hata oluştu." });
        } finally {
            setLoadingAI(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>🌍 Web Canlı Mod</Text>
            <Text style={styles.subHeader}>
                {location ? "Konumunduza göre gerçek mekanlar listeleniyor." : "Konum alınıyor..."}
            </Text>

            {/* Mekan Listesi */}
            {loadingPlaces ? (
                <View style={{ marginTop: 50, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#6C5CE7" />
                    <Text style={{ marginTop: 10, color: '#636e72' }}>Mekanlar aranıyor...</Text>
                </View>
            ) : lastError ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: '#d63031', fontWeight: 'bold', fontSize: 16 }}>⚠️ Hata Oluştu</Text>
                    <Text style={{ textAlign: 'center', marginTop: 5 }}>{lastError}</Text>
                </View>
            ) : places.length === 0 && location ? (
                <Text style={{ textAlign: 'center', marginTop: 50, color: '#636e72' }}>Yakınlarda uygun mekan bulunamadı.</Text>
            ) : (
                <ScrollView contentContainerStyle={styles.list}>
                    {places.map((place) => (
                        <TouchableOpacity
                            key={place.id}
                            style={styles.card}
                            onPress={() => handlePress(place)}
                        >
                            <Text style={styles.cardTitle}>{place.name}</Text>
                            <Text style={styles.cardSub}>{place.formattedAddress}</Text>
                            <Text style={{ color: '#6C5CE7', marginTop: 5 }}>AI ile Analiz Et 👉</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {/* Mood Seçimi */}
            <View style={styles.moodContainer}>
                <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Hangi Moddasın?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {MOODS.map((mood) => (
                        <TouchableOpacity
                            key={mood.id}
                            style={[
                                styles.moodBtn,
                                selectedMood === mood.id && { backgroundColor: mood.color, borderColor: mood.color }
                            ]}
                            onPress={() => setSelectedMood(mood.id)}
                        >
                            <Text style={{ color: selectedMood === mood.id ? 'white' : 'black' }}>{mood.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* SONUÇ EKRANI (GURME MODU) */}
            <Modal visible={modalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{selectedPlace?.name}</Text>

                        {loadingAI ? (
                            <View style={{ padding: 20 }}>
                                <ActivityIndicator size="large" color="#6C5CE7" />
                                <Text style={{ textAlign: 'center', marginTop: 10 }}>Yapay Zeka Mekanı İnceliyor...</Text>
                            </View>
                        ) : (
                            <ScrollView>
                                <Text style={{ fontSize: 40, fontWeight: 'bold', textAlign: 'center', color: aiResult?.score && aiResult.score > 7 ? '#00b894' : '#d63031' }}>
                                    {aiResult?.score}/10
                                </Text>
                                <Text style={{ fontSize: 16, textAlign: 'center', marginTop: 10, marginBottom: 20, fontStyle: 'italic' }}>
                                    "{aiResult?.reason}"
                                </Text>

                                {/* Gurme Detayları */}
                                {aiResult?.drink && (
                                    <View style={styles.detailRow}>
                                        <Text style={{ fontSize: 20 }}>☕</Text>
                                        <Text style={styles.detailText}>{aiResult.drink}</Text>
                                    </View>
                                )}
                                {aiResult?.tip && (
                                    <View style={styles.detailRow}>
                                        <Text style={{ fontSize: 20 }}>💡</Text>
                                        <Text style={styles.detailText}>{aiResult.tip}</Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}

                        <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Tamamdır</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f6fa', padding: 20 },
    header: { fontSize: 24, fontWeight: 'bold', color: '#2d3436' },
    subHeader: { fontSize: 14, color: '#636e72', marginBottom: 20 },
    list: { paddingBottom: 100 },
    card: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
    cardTitle: { fontSize: 18, fontWeight: 'bold' },
    cardSub: { color: '#b2bec3' },
    moodContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    moodBtn: { padding: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#dfe6e9' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalCard: { backgroundColor: 'white', width: '90%', maxHeight: '80%', padding: 25, borderRadius: 20 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
    closeBtn: { marginTop: 20, backgroundColor: '#2d3436', padding: 12, borderRadius: 10, alignItems: 'center' },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#f1f2f6', padding: 10, borderRadius: 10 },
    detailText: { marginLeft: 10, fontSize: 14, color: '#2d3436', flex: 1 }
});