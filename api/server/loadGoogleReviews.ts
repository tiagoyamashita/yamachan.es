// server/loadGoogleReviews.ts

interface GoogleReview {
    author_name: string;
    rating: number;
    text: string;
    time: number;
    profile_photo_url?: string;
  }
  
  export async function loadGoogleReviews(): Promise<GoogleReview[]> {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    const placeId = process.env.GOOGLE_PLACE_ID;
    
    if (!apiKey || !placeId) {
      console.warn('Missing Google API credentials');
      return [];
    }
  
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      url.searchParams.append('place_id', placeId);
      url.searchParams.append('key', apiKey);
      url.searchParams.append('fields', 'reviews');
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Google API error: ${data.status}`);
      }
      
      return data.result?.reviews || [];
      
    } catch (error) {
      console.error('Failed to load Google reviews:', error);
      return []; // Return empty array instead of throwing
    }
  }