import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { BadgeCheck, Gift, Heart, History, UserRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Profile",
  description: "DineFlow customer profile.",
};

export default function ProfilePage() {
  const profileCards = [
    {
      title: "Verified guest",
      text: "Email verified account",
      icon: BadgeCheck,
    },
    {
      title: "Loyalty points",
      text: "1,240 points",
      icon: Gift,
    },
    {
      title: "Dining profile",
      text: "Spicy, seafood, desserts",
      icon: UserRound,
    },
    {
      title: "Favorite dishes",
      text: "Double tap menu cards to save favorites",
      icon: Heart,
    },
    {
      title: "Recently ordered",
      text: "Lagoon Crab Kottu, King Coconut Spritz",
      icon: History,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["customer", "admin"]} pathname="/profile">
      <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-28 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(6,78,59,0.34),rgba(24,24,27,0.88),rgba(124,45,18,0.18))] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-orange-200">
            Guest profile
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Your DineFlow profile</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Loyalty, preferences, and recent activity will sync from the backend.
          </p>
        </section>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {profileCards.map(({ icon: Icon, text, title }) => (
            <Card
              key={title}
              className="rounded-lg border border-white/10 bg-white/[0.035] py-0"
            >
              <CardContent className="p-5">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-200">
                  <Icon className="size-5" />
                </div>
                <h2 className="mt-5 font-semibold">{title}</h2>
                <p className="mt-2 text-sm text-zinc-400">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      </main>
    </ProtectedRoute>
  );
}
