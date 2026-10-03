import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const trips = await prisma.trip.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My trips</h1>
      {trips.length === 0 && <p className="text-gray-600">No saved trips yet. Go plan one!</p>}
      <div className="grid gap-4">
        {trips.map((trip) => (
          <Link
            key={trip.id}
            href={`/trips/${trip.id}`}
            className="bg-white p-4 rounded-lg border hover:border-black transition"
          >
            <h2 className="font-semibold">{trip.destination}</h2>
            <p className="text-sm text-gray-500">
              {trip.days} days · {trip.budget} budget
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
