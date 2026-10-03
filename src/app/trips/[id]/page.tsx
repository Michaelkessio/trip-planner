import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ItineraryView from "@/components/ItineraryView";
import { TripPlan } from "@/types/trip";

export default async function TripDetail({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const trip = await prisma.trip.findFirst({
    where: { id: params.id, userId: (session.user as any).id },
  });
  if (!trip) notFound();

  return <ItineraryView trip={trip.itinerary as unknown as TripPlan} saved />;
}
