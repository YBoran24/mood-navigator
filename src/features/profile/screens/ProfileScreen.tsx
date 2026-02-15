
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { getPhotoUrl } from '../../../services/placesService';
import { getVisits, Visit } from '../../../services/storageService';

export const ProfileScreen = () => {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(false);

    const loadVisits = async () => {
        setLoading(true);
        const data = await getVisits();
        setVisits(data);
        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadVisits();
        }, [])
    );

    const renderItem = ({ item }: { item: Visit }) => {
        const photoUrl = item.photos && item.photos.length > 0 ? getPhotoUrl(item.photos[0].name, 200) : null;
        const date = new Date(item.visitedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Image
                        source={photoUrl ? { uri: photoUrl } : { uri: 'https://via.placeholder.com/150' }}
                        style={styles.image}
                    />
                    <View style={styles.headerInfo}>
                        <Text style={styles.placeName}>{item.name}</Text>
                        <Text style={styles.dateText}>{date}</Text>
                        <View style={styles.ratingContainer}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Text key={i} style={{ fontSize: 14 }}>
                                    {i < (item.rating || 0) ? "⭐" : "☆"}
                                </Text>
                            ))}
                        </View>
                    </View>
                </View>

                {item.note && (
                    <View style={styles.noteContainer}>
                        <Text style={styles.noteText}>"{item.note}"</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image
                    source={{ uri: 'https://ui-avatars.com/api/?name=Gezgin&background=6C5CE7&color=fff&size=128' }}
                    style={styles.avatar}
                />
                <Text style={styles.username}>Merhaba, Gezgin! 👋</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{visits.length}</Text>
                        <Text style={styles.statLabel}>Ziyaret</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>
                            {visits.reduce((acc, curr) => acc + (curr.rating || 0), 0) / (visits.length || 1) > 0
                                ? (visits.reduce((acc, curr) => acc + (curr.rating || 0), 0) / visits.length).toFixed(1)
                                : "0.0"}
                        </Text>
                        <Text style={styles.statLabel}>Ort. Puan</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Anı Defteri 📒</Text>

            <FlatList
                data={visits}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadVisits} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Henüz bir anı kaydetmedin.</Text>
                        <Text style={styles.subText}>Gezdiğin yerleri haritadan işaretle!</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f6fa',
    },
    header: {
        backgroundColor: 'white',
        paddingTop: 60,
        paddingBottom: 20,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 20
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 10
    },
    username: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2d3436',
        marginBottom: 15
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        paddingHorizontal: 20
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#6C5CE7'
    },
    statLabel: {
        fontSize: 12,
        color: '#636e72'
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: '#dfe6e9'
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2d3436',
        marginLeft: 20,
        marginBottom: 10
    },
    list: {
        paddingHorizontal: 20,
        paddingBottom: 20
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 15,
        marginBottom: 15,
        padding: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    image: {
        width: 50,
        height: 50,
        borderRadius: 10,
        marginRight: 15
    },
    headerInfo: {
        flex: 1
    },
    placeName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2d3436'
    },
    dateText: {
        fontSize: 12,
        color: '#b2bec3',
        marginBottom: 2
    },
    ratingContainer: {
        flexDirection: 'row'
    },
    noteContainer: {
        marginTop: 10,
        backgroundColor: '#f1f2f6',
        padding: 10,
        borderRadius: 10
    },
    noteText: {
        fontStyle: 'italic',
        color: '#636e72'
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#b2bec3'
    },
    subText: {
        color: '#dfe6e9',
        marginTop: 5
    }
});
