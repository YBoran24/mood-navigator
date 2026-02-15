
import { API_KEY } from './aiService';

export type Place = {
    id: string;
    name: string;
    formattedAddress: string;
    location: {
        latitude: number;
        longitude: number;
    };
    types?: string[];
    photos?: { name: string; authorAttributions?: any[] }[];
    rating?: number;
    userRatingCount?: number;
};

const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';

// Helper to get image URL
export const getPhotoUrl = (photoName?: string, maxWidth: number = 400) => {
    if (!photoName) return null;
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=${maxWidth}&maxWidthPx=${maxWidth}&key=${API_KEY}`;
};

export const searchPlaces = async (
    query: string
): Promise<{ success: boolean; data: Place[]; error?: string }> => {

    if (!query.trim()) return { success: false, data: [] };

    console.log(`Searching Places for: "${query}"`);

    try {
        const response = await fetch(GOOGLE_PLACES_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': API_KEY,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.photos,places.rating,places.userRatingCount'
            },
            body: JSON.stringify({
                textQuery: query
            })
        });

        const data = await response.json();

        if (data.places) {
            const results: Place[] = data.places.map((place: any) => ({
                id: place.id,
                name: place.displayName?.text || "Bilinmeyen Mekan",
                formattedAddress: place.formattedAddress,
                location: {
                    latitude: place.location.latitude,
                    longitude: place.location.longitude
                },
                types: place.types,
                photos: place.photos,
                rating: place.rating,
                userRatingCount: place.userRatingCount
            }));
            return { success: true, data: results };
        } else {
            console.warn("Places API warning:", data);
            return { success: false, data: [], error: "Mekan bulunamadı." };
        }

    } catch (error: any) {
        console.error("Search Error:", error);
        return { success: false, data: [], error: error.message };
    }
};

// Eski fonksiyonu uyumluluk için tutuyoruz
export const fetchNearbyPlaces = async () => {
    return { success: false, data: [], error: "Bu fonksiyon artık kullanılmıyor, searchPlaces kullanın." };
};
