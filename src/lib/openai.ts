import OpenAI from "openai";
import { PlaceResult, TripPlan } from "@/types/trip";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateItinerary(params: {
  destination: string;
  budget: string;
  days: number;
  interests?: string;
  attractions: PlaceResult[];
  restaurants: PlaceResult[];
}): Promise<TripPlan> {
  const { destination, budget, days, interests, attractions, restaurants } = params;

  const describe = (p: (typeof attractions)[number]) => {
    const rating = p.rating ? ` | rating: ${p.rating}/5` : "";
    const hours = p.openingHoursText?.length ? ` | hours: ${p.openingHoursText.join("; ")}` : "";
    const openNow =
      p.openNow !== undefined ? ` | currently: ${p.openNow ? "open" : "closed"}` : "";
    return `- ${p.name} (${p.address})${rating}${openNow}${hours}`;
  };

  const attractionList = attractions.slice(0, 20).map(describe).join("\n");
  const restaurantList = restaurants.slice(0, 20).map(describe).join("\n");

  const prompt = `You are a travel planning assistant. Build a ${days}-day itinerary for ${destination}.
Budget level: ${budget}.
Traveler interests: ${interests || "general sightseeing"}.

Only use these REAL places (do not invent new ones). Pick a sensible subset, group nearby places on the same day, and order each day logically. Where a place lists opening hours, schedule it at a time it is actually likely to be open - don't put a museum at 9pm if its hours say it closes at 6pm. Prefer higher-rated places when choosing between similar options.

ATTRACTIONS:
${attractionList || "(none found - use general well-known landmarks for the destination)"}

RESTAURANTS:
${restaurantList || "(none found - suggest general restaurant types)"}

Return ONLY valid JSON with no markdown fences and no commentary, matching exactly this shape:
{
  "summary": "string, 1-2 sentence overview of the trip",
  "itinerary": [
    {
      "day": 1,
      "title": "short theme for the day",
      "items": [
        {
          "time": "e.g. 9:00 AM",
          "title": "short activity title",
          "description": "1-2 sentences",
          "type": "attraction | restaurant | activity | transport",
          "placeName": "name of the real place used, if any",
          "address": "address of that place, if any",
          "estimatedCost": "e.g. $, $$, $$$ or an approximate amount"
        }
      ]
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const raw = completion.choices[0].message.content || "{}";
  const parsed = JSON.parse(raw);

  return {
    destination,
    budget,
    days,
    interests,
    summary: parsed.summary,
    itinerary: parsed.itinerary,
  };
}
