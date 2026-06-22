import type { Metadata } from "next";
import { Star } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Reviews" };

export default function ReviewsPage() {
  return (
    <ProtectedRoute allowedRoles={["customer"]} pathname="/customer/reviews">
      <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-28 text-white sm:px-6">
        <div className="mx-auto max-w-3xl space-y-5">
          <section className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(5,150,105,0.22),rgba(24,24,27,0.9),rgba(234,88,12,0.16))] p-5">
            <h1 className="text-3xl font-semibold">Review your meal</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Submit a rating after your order is completed.
            </p>
          </section>
          <Card className="rounded-lg border border-white/10 bg-white/[0.035] py-0">
            <CardContent className="space-y-4 p-5">
              <div className="flex gap-2 text-orange-200">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="size-6 fill-current" />
                ))}
              </div>
              <textarea
                className="min-h-32 w-full rounded-lg border border-white/10 bg-black/20 p-3 text-sm outline-none focus:border-emerald-300/50"
                placeholder="Tell the restaurant what worked well or what needs attention."
              />
              <Button className="bg-emerald-400 text-zinc-950 hover:bg-emerald-300">
                Submit review
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </ProtectedRoute>
  );
}
