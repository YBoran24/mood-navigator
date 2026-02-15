# Mood Navigator

Mood Navigator is a React Native applications built with Expo that allows users to track their moods and visualize them on a map.

## Tech Stack
- **Framework:** React Native (Expo)
- **Maps:** React Native Maps (Google Maps Provider)
- **Backend/Auth:** Supabase
- **Language:** TypeScript

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Expo Go app on your mobile device (or a Simulator)

### Installation
1. Clone the repository (if applicable) or navigate to the project directory.
2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Configuration
Create a structure for your environment variables (e.g., in a `.env` file if you add `react-native-dotenv` later, or directly in `app.json` for some configs).

**Required Keys:**
- **Google Maps API Key:** Required for Android (and iOS if not using Apple Maps). Check `app.json` configuration.
- **Supabase URL & Anon Key:** Update `src/services/supabase.ts` (file to be created) with your credentials.

### Running the App
- Start the development server:
  ```bash
  npx expo start
  ```
- Scan the QR code with Expo Go (Android) or use the Camera app (iOS).

## Project Structure
The project follows a feature-based architecture:
```
src/
  features/   # Core domain features (map, mood, auth)
  components/ # Shared UI components
  services/   # External services (Supabase, API clients)
  utils/      # Helper functions
```
