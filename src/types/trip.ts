export interface ItineraryItem {
  time: string;
  title: string;
  description: string;
  type: "attraction" | "restaurant" | "activity" | "transport";
  placeName?: string;
  address?: string;
  lat?: number;
  lng?: number;
  estimatedCost?: string;
  rating?: number;
  openNow?: boolean;
  /** Travel time from the previous item in the day, e.g. "12 min walk". Empty for the first item. */
  travelTimeFromPrevious?: string;
}

export interface WeatherDay {
  date: string;
  highC: number;
  lowC: number;
  condition: string;
  precipitationChance?: number;
}

export interface ItineraryDay {
  day: number;
  title: string;
  date?: string;
  weather?: WeatherDay;
  items: ItineraryItem[];
}

export interface FlightOption {
  airline: string;
  departAirport: string;
  arriveAirport: string;
  departTime: string;
  arriveTime: string;
  price: string;
  stops: number;
}

export interface HotelOption {
  name: string;
  address?: string;
  rating?: string;
  price?: string;
}

export interface TripPlan {
  destination: string;
  budget: string;
  days: number;
  interests?: string;
  startDate?: string;
  origin?: string;
  destinationCode?: string;
  summary: string;
  itinerary: ItineraryDay[];
  flights?: FlightOption[];
  hotels?: HotelOption[];
  weatherNote?: string;
  travelDataNote?: string;
}

export interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  priceLevel?: number;
  types: string[];
  placeId?: string;
  openNow?: boolean;
  openingHoursText?: string[];
}
