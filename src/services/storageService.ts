
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Place } from './placesService';

const FAVORITES_KEY = 'favorites_v1';
const VISITS_KEY = 'visits_v1';

export type Visit = Place & {
    visitedAt: string; // ISO Date string
    note?: string;
    rating?: number;
};

export const getFavorites = async (): Promise<Place[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(FAVORITES_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Error reading favorites:', e);
        return [];
    }
};

export const toggleFavorite = async (place: Place): Promise<boolean> => {
    try {
        const favorites = await getFavorites();
        const index = favorites.findIndex(p => p.id === place.id);
        let newFavorites;
        let isAdded = false;

        if (index >= 0) {
            // Remove
            newFavorites = favorites.filter(p => p.id !== place.id);
            isAdded = false;
        } else {
            // Add
            newFavorites = [...favorites, place];
            isAdded = true;
        }

        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
        return isAdded;
    } catch (e) {
        console.error('Error toggling favorite:', e);
        return false;
    }
};

export const isFavorite = async (placeId: string): Promise<boolean> => {
    try {
        const favorites = await getFavorites();
        return favorites.some(p => p.id === placeId);
    } catch (e) {
        return false;
    }
};

// --- Visits / Check-ins ---

export const getVisits = async (): Promise<Visit[]> => {
    try {
        const jsonValue = await AsyncStorage.getItem(VISITS_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Error reading visits:', e);
        return [];
    }
};

export const addVisit = async (visit: Visit): Promise<void> => {
    try {
        const visits = await getVisits();
        // Aynı mekana birden fazla check-in yapılabilir, o yüzden unique ID kontrolü yapmıyoruz direkt ekliyoruz.
        // Ama en yeni en üstte olsun.
        const newVisits = [visit, ...visits];
        await AsyncStorage.setItem(VISITS_KEY, JSON.stringify(newVisits));
    } catch (e) {
        console.error('Error adding visit:', e);
    }
};

export const hasVisited = async (placeId: string): Promise<boolean> => {
    try {
        const visits = await getVisits();
        return visits.some(v => v.id === placeId);
    } catch (e) {
        return false;
    }
};
