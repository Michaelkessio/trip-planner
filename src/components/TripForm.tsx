"use client";

import { useState } from "react";
import { TripPlan } from "@/types/trip";

export default function TripForm({
  onGenerated,
}: {
  onGenerated: (trip: TripPlan, center: { lat: number; lng: number }) => void;
}) {
  const [destination, setDestination] = useState("");
  const [budget, setBudget] = useState("moderate");
  const [days, setDays] = useState(3);
  const [interests, setInterests] = useState("");
  const [startDate, setStartDate] = useState("");
  const [origin, setOrigin] = useState("");
  const [destinationCode, setDestinationCode] = useState("");
  const [showTravelData, setShowTravelData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          budget,
          days,
          interests,
          startDate: startDate || undefined,
          origin: origin || undefined,
          destinationCode: destinationCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate itinerary");
      onGenerated(data.trip, data.center);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Destination</label>
        <input
          required
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="e.g. Lisbon, Portugal"
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Budget</label>
          <select
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="budget">Budget</option>
            <option value="moderate">Moderate</option>
            <option value="luxury">Luxury</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Days</label>
          <input
            type="number"
            min={1}
            max={14}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Interests (optional)</label>
        <input
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          placeholder="e.g. food, art museums, hiking"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Start date (optional)</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          Adds a weather forecast per day (if within ~16 days out), and unlocks flight/hotel search below.
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowTravelData(!showTravelData)}
          className="text-sm text-gray-600 underline"
        >
          {showTravelData ? "Hide" : "Add"} flight & hotel search
        </button>
        {showTravelData && (
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium mb-1">From (airport code)</label>
              <input
                value={origin}
                onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                placeholder="e.g. JFK"
                maxLength={3}
                className="w-full border rounded px-3 py-2 uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To (city/airport code)</label>
              <input
                value={destinationCode}
                onChange={(e) => setDestinationCode(e.target.value.toUpperCase())}
                placeholder="e.g. LIS"
                maxLength={3}
                className="w-full border rounded px-3 py-2 uppercase"
              />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        disabled={loading}
        className="w-full bg-black text-white rounded py-2 disabled:opacity-50"
      >
        {loading ? "Planning your trip..." : "Generate itinerary"}
      </button>
    </form>
  );
}
