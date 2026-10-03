import { PlaceResult } from "@/types/trip";

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";
const GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode/json";

export async function geocodeDestination(destination: string) {
  const url = `${GEOCODE_BASE}?address=${encodeURIComponent(
    destination
  )}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.results?.length) {
    throw new Error(`Could not find location: ${destination}`);
  }

  const { lat, lng } = data.results[0].geometry.location;
  const formattedAddress: string = data.results[0].formatted_address;
  return { lat, lng, formattedAddress };
}

async function textSearch(
  query: string,
  lat: number,
  lng: number,
  radius = 15000
): Promise<PlaceResult[]> {
  const url = `${PLACES_BASE}/textsearch/json?query=${encodeURIComponent(
    query
  )}&location=${lat},${lng}&radius=${radius}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  return (data.results || []).map((p: any) => ({
    name: p.name,
    address: p.formatted_address,
    lat: p.geometry?.location?.lat,
    lng: p.geometry?.location?.lng,
    rating: p.rating,
    priceLevel: p.price_level,
    types: p.types || [],
    placeId: p.place_id,
  }));
}

export async function findAttractions(destination: string, lat: number, lng: number) {
  return textSearch(`top tourist attractions in ${destination}`, lat, lng);
}

export async function findRestaurants(
  destination: string,
  lat: number,
  lng: number,
  budget: string
) {
  const priceHint =
    budget === "budget" ? "cheap eats" : budget === "luxury" ? "fine dining" : "popular restaurants";
  return textSearch(`${priceHint} in ${destination}`, lat, lng);
}

/**
 * Fetch live details (opening hours, open-now status) for a single place.
 * Costs one Place Details call - only call this for a bounded subset of results.
 */
export async function getPlaceDetails(placeId: string) {
  const url = `${PLACES_BASE}/details/json?place_id=${placeId}&fields=opening_hours,rating&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const result = data.result || {};
  return {
    openNow: result.opening_hours?.open_now as boolean | undefined,
    openingHoursText: result.opening_hours?.weekday_text as string[] | undefined,
    rating: result.rating as number | undefined,
  };
}

/**
 * Enrich the top N places (by original search order) with live Place Details data.
 * Capped to limit API cost/latency - callers should pass their best candidates first.
 */
export async function enrichWithDetails(
  places: PlaceResult[],
  limit: number
): Promise<PlaceResult[]> {
  const toEnrich = places.slice(0, limit);
  const rest = places.slice(limit);

  const enriched = await Promise.all(
    toEnrich.map(async (p) => {
      if (!p.placeId) return p;
      try {
        const details = await getPlaceDetails(p.placeId);
        return {
          ...p,
          openNow: details.openNow,
          openingHoursText: details.openingHoursText,
          rating: details.rating ?? p.rating,
        };
      } catch {
        return p;
      }
    })
  );

  return [...enriched, ...rest];
}

/**
 * Real travel time between two points (Distance Matrix API).
 * Returns null if the API has no route for the given mode.
 */
export async function getTravelTime(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode: "walking" | "driving" | "transit" = "walking"
) {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=${mode}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK") return null;
  return { text: element.duration.text as string, seconds: element.duration.value as number };
}
