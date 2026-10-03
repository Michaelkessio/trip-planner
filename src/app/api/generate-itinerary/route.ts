import { NextResponse } from "next/server";
import {
  geocodeDestination,
  findAttractions,
  findRestaurants,
  enrichWithDetails,
  getTravelTime,
} from "@/lib/googleMaps";
import { generateItinerary } from "@/lib/openai";
import { getWeatherForecast } from "@/lib/weather";
import { searchFlights, searchHotels } from "@/lib/amadeus";
import { ItineraryDay, PlaceResult, TripPlan } from "@/types/trip";

function findMatchingPlace(placeName: string | undefined, places: PlaceResult[]) {
  if (!placeName) return undefined;
  const needle = placeName.toLowerCase();
  return places.find(
    (p) => p.name.toLowerCase() === needle || needle.includes(p.name.toLowerCase())
  );
}

/** Attach lat/lng/rating/openNow to each item by matching its placeName back to the real place data. */
function attachPlaceData(itinerary: ItineraryDay[], places: PlaceResult[]) {
  for (const day of itinerary) {
    for (const item of day.items) {
      const match = findMatchingPlace(item.placeName, places);
      if (match) {
        item.lat = match.lat;
        item.lng = match.lng;
        item.rating = match.rating;
        item.openNow = match.openNow;
      }
    }
  }
}

/** Fill in travelTimeFromPrevious for consecutive items that both have coordinates. */
async function attachTravelTimes(itinerary: ItineraryDay[]) {
  for (const day of itinerary) {
    for (let i = 1; i < day.items.length; i++) {
      const prev = day.items[i - 1];
      const curr = day.items[i];
      if (prev.lat && prev.lng && curr.lat && curr.lng) {
        try {
          const travel = await getTravelTime(prev.lat, prev.lng, curr.lat, curr.lng, "walking");
          if (travel) curr.travelTimeFromPrevious = `${travel.text} walk`;
        } catch {
          // Non-critical - itinerary still works without travel time.
        }
      }
    }
  }
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const {
      destination,
      budget,
      days,
      interests,
      startDate, // optional, "YYYY-MM-DD" - enables weather + flights/hotels
      origin, // optional IATA code, e.g. "JFK" - enables flight search
      destinationCode, // optional IATA city/airport code - enables flight + hotel search
    } = await req.json();

    if (!destination || !budget || !days) {
      return NextResponse.json({ error: "Missing destination, budget, or days." }, { status: 400 });
    }
    const numDays = Number(days);

    const { lat, lng, formattedAddress } = await geocodeDestination(destination);

    const [rawAttractions, rawRestaurants] = await Promise.all([
      findAttractions(destination, lat, lng),
      findRestaurants(destination, lat, lng, budget),
    ]);

    // Live opening-hours/rating data, capped to keep latency and API cost bounded.
    const [attractions, restaurants] = await Promise.all([
      enrichWithDetails(rawAttractions, 8),
      enrichWithDetails(rawRestaurants, 6),
    ]);

    const trip: TripPlan = await generateItinerary({
      destination: formattedAddress,
      budget,
      days: numDays,
      interests,
      attractions,
      restaurants,
    });

    const allPlaces = [...attractions, ...restaurants];
    attachPlaceData(trip.itinerary, allPlaces);
    await attachTravelTimes(trip.itinerary);

    trip.startDate = startDate || undefined;
    trip.origin = origin || undefined;
    trip.destinationCode = destinationCode || undefined;

    // Weather: only meaningful with a start date, and only if Open-Meteo has a forecast that far out.
    if (startDate) {
      try {
        const weather = await getWeatherForecast(lat, lng, startDate, numDays);
        if (weather) {
          weather.forEach((w, i) => {
            if (trip.itinerary[i]) {
              trip.itinerary[i].date = w.date;
              trip.itinerary[i].weather = w;
            }
          });
        } else {
          trip.weatherNote = "Forecast isn't available yet for these dates - check back closer to your trip.";
        }
      } catch {
        trip.weatherNote = "Couldn't load a weather forecast right now.";
      }
    }

    // Flights + hotels: need an origin, a destination code, and a start date.
    if (origin && destinationCode && startDate) {
      try {
        const returnDate = addDays(startDate, Math.max(1, numDays - 1));
        const [flights, hotels] = await Promise.all([
          searchFlights(origin, destinationCode, startDate, returnDate),
          searchHotels(destinationCode, startDate, returnDate),
        ]);
        trip.flights = flights;
        trip.hotels = hotels;
        if (!flights.length && !hotels.length) {
          trip.travelDataNote =
            "No live flight/hotel offers found for this route and date - the search provider's test data covers a limited set of routes.";
        }
      } catch (e: any) {
        trip.travelDataNote = e.message || "Couldn't load flight/hotel data right now.";
      }
    }

    return NextResponse.json({ trip, center: { lat, lng } });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Failed to generate itinerary." },
      { status: 500 }
    );
  }
}
