
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Place, getPhotoUrl } from '../../../services/placesService';
import { getFavorites, toggleFavorite } from '../../../services/storageService';

export const FavoritesScreen = () => {
    const [favorites, setFavorites] = useState<Place[]>([]);
    const [loading, setLoading] = useState(false);

    const loadFavorites = async () => {
        setLoading(true);
        const favs = await getFavorites();
        setFavorites(favs);
        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadFavorites();
        }, [])
    );

    const handleRemove = async (place: Place) => {
        await toggleFavorite(place);
        loadFavorites();
    };

    const renderItem = ({ item }: { item: Place }) => {
        const photoUrl = item.photos && item.photos.length > 0 ? getPhotoUrl(item.photos[0].name, 200) : null;

        return (
            <View style={styles.card}>
                <Image
                    source={photoUrl ? { uri: photoUrl } : { uri: 'https://via.placeholder.com/150' }}
                    style={styles.image}
                />
                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.address} numberOfLines={2}>{item.formattedAddress}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemove(item)} style={styles.removeBtn}>
                    <IconSymbol name="trash.fill" size={20} color="#ff7675" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Favori Mekanlarım ❤️</Text>
            {favorites.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Henüz favorin yok.</Text>
                    <Text style={styles.subText}>Haritadan beğendiğin mekanları ekle!</Text>
                </View>
            ) : (
                <FlatList
                    data={favorites}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadFavorites} />}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f6fa',
        paddingTop: 60,
        paddingHorizontal: 20
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2d3436',
        marginBottom: 20
    },
    list: {
        paddingBottom: 20
    },
    card: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 15,
        marginBottom: 15,
        padding: 10,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3
    },
    image: {
        width: 60,
        height: 60,
        borderRadius: 10,
        backgroundColor: '#dfe6e9'
    },
    info: {
        flex: 1,
        marginLeft: 15
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2d3436'
    },
    address: {
        fontSize: 12,
        color: '#636e72',
        marginTop: 2
    },
    removeBtn: {
        padding: 10
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -50
    },
    emptyText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#b2bec3'
    },
    subText: {
        fontSize: 14,
        color: '#b2bec3',
        marginTop: 5
    }
});
