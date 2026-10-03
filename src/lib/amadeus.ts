import { FlightOption, HotelOption } from "@/types/trip";

const AMADEUS_BASE =
  process.env.AMADEUS_HOSTNAME === "production"
    ? "https://api.amadeus.com"
    : "https://test.api.amadeus.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.AMADEUS_CLIENT_ID || "",
      client_secret: process.env.AMADEUS_CLIENT_SECRET || "",
    }),
  });

  if (!res.ok) throw new Error("Could not authenticate with Amadeus - check AMADEUS_CLIENT_ID/SECRET.");

  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

/**
 * Round-trip or one-way flight search between two IATA airport/city codes.
 * Uses the Amadeus test (sandbox) environment by default - sandbox data covers a
 * limited set of routes/dates, so empty results there don't necessarily mean "no flights".
 */
export async function searchFlights(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string
): Promise<FlightOption[]> {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    originLocationCode: origin.toUpperCase(),
    destinationLocationCode: destination.toUpperCase(),
    departureDate,
    adults: "1",
    max: "5",
    currencyCode: "USD",
  });
  if (returnDate) params.set("returnDate", returnDate);

  const res = await fetch(`${AMADEUS_BASE}/v2/shopping/flight-offers?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();

  return (data.data || []).map((offer: any) => {
    const segments = offer.itineraries[0].segments;
    return {
      airline: offer.validatingAirlineCodes?.[0] || segments[0].carrierCode || "Unknown",
      departAirport: segments[0].departure.iataCode,
      arriveAirport: segments[segments.length - 1].arrival.iataCode,
      departTime: segments[0].departure.at,
      arriveTime: segments[segments.length - 1].arrival.at,
      price: `${offer.price.total} ${offer.price.currency}`,
      stops: segments.length - 1,
    };
  });
}

/**
 * Hotel search for a city/airport IATA code. Looks up hotels in the city, then
 * fetches live offers for a capped subset to keep latency/cost reasonable.
 */
export async function searchHotels(
  cityCode: string,
  checkInDate: string,
  checkOutDate: string
): Promise<HotelOption[]> {
  const token = await getAccessToken();

  const listRes = await fetch(
    `${AMADEUS_BASE}/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode.toUpperCase()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listRes.ok) return [];
  const listData = await listRes.json();
  const hotelIds = (listData.data || []).slice(0, 10).map((h: any) => h.hotelId);
  if (!hotelIds.length) return [];

  const offersRes = await fetch(
    `${AMADEUS_BASE}/v3/shopping/hotel-offers?hotelIds=${hotelIds.join(",")}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!offersRes.ok) return [];
  const offersData = await offersRes.json();

  return (offersData.data || [])
    .filter((h: any) => h.offers?.length)
    .map((h: any) => ({
      name: h.hotel.name,
      address: h.hotel.address?.lines?.join(", "),
      rating: h.hotel.rating,
      price: h.offers[0] ? `${h.offers[0].price.total} ${h.offers[0].price.currency}` : undefined,
    }));
}
