"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { TripPlan } from "@/types/trip";

export default function ItineraryView({
  trip,
  center,
  saved = false,
}: {
  trip: TripPlan;
  center?: { lat: number; lng: number };
  saved?: boolean;
}) {
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination: trip.destination,
        budget: trip.budget,
        days: trip.days,
        interests: trip.interests,
        itinerary: trip,
      }),
    });
    setSaving(false);
    setSavedMsg(res.ok ? "Trip saved!" : "Could not save trip.");
  }

  const mapSrc =
    center && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      ? `https://www.google.com/maps/embed/v1/view?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&center=${center.lat},${center.lng}&zoom=12`
      : null;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold">{trip.destination}</h2>
        <p className="text-gray-600 mt-1">{trip.summary}</p>
        {!saved && session && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save trip"}
          </button>
        )}
        {!saved && !session && (
          <p className="mt-4 text-sm text-gray-500">Sign in to save this trip.</p>
        )}
        {savedMsg && <p className="mt-2 text-sm text-green-600">{savedMsg}</p>}
      </div>

      {mapSrc && <iframe src={mapSrc} className="w-full h-72 rounded-lg border" loading="lazy" />}

      {trip.weatherNote && (
        <p className="text-sm text-gray-500 bg-gray-100 border rounded px-4 py-2">{trip.weatherNote}</p>
      )}

      {(trip.flights?.length || trip.hotels?.length) ? (
        <div className="grid md:grid-cols-2 gap-6">
          {!!trip.flights?.length && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="font-semibold mb-3">Flights</h3>
              <ul className="space-y-3 text-sm">
                {trip.flights.map((f, i) => (
                  <li key={i} className="border-b last:border-0 pb-2 last:pb-0">
                    <p className="font-medium">
                      {f.departAirport} &rarr; {f.arriveAirport} &middot; {f.airline}
                    </p>
                    <p className="text-gray-600">
                      {new Date(f.departTime).toLocaleString()} &middot;{" "}
                      {f.stops === 0 ? "nonstop" : `${f.stops} stop${f.stops > 1 ? "s" : ""}`}
                    </p>
                    <p className="text-gray-900 font-medium">{f.price}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!trip.hotels?.length && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="font-semibold mb-3">Hotels</h3>
              <ul className="space-y-3 text-sm">
                {trip.hotels.map((h, i) => (
                  <li key={i} className="border-b last:border-0 pb-2 last:pb-0">
                    <p className="font-medium">{h.name}</p>
                    {h.address && <p className="text-gray-600">{h.address}</p>}
                    {h.price && <p className="text-gray-900 font-medium">{h.price}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : trip.travelDataNote ? (
        <p className="text-sm text-gray-500 bg-gray-100 border rounded px-4 py-2">{trip.travelDataNote}</p>
      ) : null}

      {trip.itinerary?.map((day) => (
        <div key={day.day} className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">
              Day {day.day}: {day.title}
              {day.date && <span className="text-gray-400 font-normal"> &middot; {day.date}</span>}
            </h3>
            {day.weather && (
              <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-1">
                {day.weather.condition} &middot; {day.weather.lowC}&deg;-{day.weather.highC}&deg;C
                {day.weather.precipitationChance !== undefined &&
                  ` · ${day.weather.precipitationChance}% rain`}
              </span>
            )}
          </div>
          <ul className="space-y-3">
            {day.items.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-gray-400 w-16 shrink-0">{item.time}</span>
                <div>
                  {item.travelTimeFromPrevious && (
                    <p className="text-gray-400 text-xs mb-1">{item.travelTimeFromPrevious} from previous stop</p>
                  )}
                  <p className="font-medium">
                    {item.title}
                    {item.placeName ? ` — ${item.placeName}` : ""}
                    {item.rating && <span className="text-gray-400 font-normal"> ({item.rating}★)</span>}
                    {item.openNow === false && (
                      <span className="text-red-500 font-normal text-xs"> · may be closed</span>
                    )}
                  </p>
                  <p className="text-gray-600">{item.description}</p>
                  {item.address && <p className="text-gray-400">{item.address}</p>}
                  {item.estimatedCost && (
                    <p className="text-gray-400">Est. cost: {item.estimatedCost}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
