import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trips = await prisma.trip.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ trips });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { destination, budget, days, interests, itinerary } = body;

  if (!destination || !budget || !days || !itinerary) {
    return NextResponse.json({ error: "Missing trip data." }, { status: 400 });
  }

  const trip = await prisma.trip.create({
    data: {
      userId: (session.user as any).id,
      destination,
      budget,
      days: Number(days),
      interests,
      itinerary,
    },
  });

  return NextResponse.json({ trip });
}
