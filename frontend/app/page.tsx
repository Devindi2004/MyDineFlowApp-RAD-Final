import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-mark";
import {
  ArrowRight,
  BarChart3,
  ChefHat,
  Clock3,
  QrCode,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

const platformCards = [
  {
    title: "Customer QR ordering",
    description: "Premium digital menu, smart filters, cart, and checkout.",
    icon: QrCode,
  },
  {
    title: "Kitchen operations",
    description: "Real-time order stages for new, preparing, and ready meals.",
    icon: ChefHat,
  },
  {
    title: "Owner intelligence",
    description: "Revenue, top items, sales trends, inventory, and reports.",
    icon: BarChart3,
  },
];

const metrics = [
  ["40%", "faster service"],
  ["24/7", "digital menu"],
  ["3", "role dashboards"],
  ["AI", "recommendations"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-zinc-950/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="hidden text-zinc-300 hover:bg-white/10 hover:text-white sm:inline-flex"
            >
              <Link href="#platform">For Restaurants</Link>
            </Button>
            <Button
              asChild
              className="bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
            >
              <Link href="/menu">
                Order now
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative min-h-[92svh] overflow-hidden border-b border-white/10 pt-24">
        <Image
          src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1800&q=85"
          alt="Luxury restaurant dining room"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.96),rgba(9,9,11,0.76)_46%,rgba(9,9,11,0.28))]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-zinc-950 to-transparent" />

        <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-4 pb-20 pt-12 sm:px-6 lg:min-h-[calc(92svh-6rem)]">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-emerald-100">
              <Sparkles className="size-3.5" />
              AI-powered restaurant flow
            </div>
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-normal text-white sm:text-7xl">
              DineFlow
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-200 sm:text-xl">
              A smart restaurant ordering and management system connecting QR
              menus, personalized recommendations, live kitchen operations, and
              owner analytics in one polished platform.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 bg-emerald-400 px-5 text-zinc-950 hover:bg-emerald-300"
              >
                <Link href="/menu">
                  Browse digital menu
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 border-white/15 bg-white/5 px-5 text-white hover:bg-white/10"
              >
                <Link href="#platform">
                  <UtensilsCrossed className="size-4" />
                  View platform
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {metrics.map(([value, label]) => (
              <div
                key={label}
                className="rounded-lg border border-white/10 bg-black/28 p-4 backdrop-blur"
              >
                <p className="text-2xl font-semibold text-emerald-200">
                  {value}
                </p>
                <p className="mt-1 text-sm text-zinc-300">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="platform" className="scroll-mt-20 bg-zinc-950 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {platformCards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.title}
                  className="rounded-lg border border-white/10 bg-white/[0.035] p-5"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-orange-400/15 text-orange-200">
                    <Icon className="size-5" />
                  </div>
                  <h2 className="mt-5 text-lg font-semibold text-white">
                    {card.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {card.description}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-6 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.04] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-200">
                  <Clock3 className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    Ready for tonight&apos;s service
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Guests scan, order, pay, and track their meals while staff
                    and owners get the operational cockpit behind the scenes.
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="bg-orange-400 text-zinc-950 hover:bg-orange-300"
              >
                <Link href="/menu">Open menu</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
