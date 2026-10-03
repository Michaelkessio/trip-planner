"use client";

import { useState } from "react";
import TripForm from "@/components/TripForm";
import ItineraryView from "@/components/ItineraryView";
import { TripPlan } from "@/types/trip";

export default function Home() {
  const [trip, setTrip] = useState<TripPlan | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | undefined>();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Plan your next trip</h1>
        <p className="text-gray-600 mb-6">
          Pick a destination and budget — AI builds the itinerary, with real places from Google
          Maps.
        </p>
        <TripForm
          onGenerated={(t, c) => {
            setTrip(t);
            setCenter(c);
          }}
        />
      </div>
      {trip && <ItineraryView trip={trip} center={center} />}
    </div>
  );
}
