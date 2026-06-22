"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, QrCode, ShoppingCart, UserRound, Utensils } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Menu",
    href: "/menu",
    icon: Utensils,
  },
  {
    label: "Cart",
    href: "/menu#cart",
    icon: ShoppingCart,
  },
  {
    label: "Orders",
    href: "/tracking",
    icon: ClipboardList,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: UserRound,
  },
];

const hiddenSegments = [
  "/admin",
  "/kitchen",
  "/login",
  "/register",
  "/check-email",
  "/verify-email",
];

export function CustomerMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const cart = useCart();
  const isHiddenRoute = hiddenSegments.some((segment) =>
    pathname.startsWith(segment)
  );

  if (isHiddenRoute) {
    return null;
  }

  const simulateQrScan = () => {
    toast.success("QR table detected", {
      description: "Opening digital menu for Table 05.",
    });
    router.push("/menu?table=5&restaurant=rest123");
  };

  return (
    <nav
      aria-label="Customer mobile navigation"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/10 bg-zinc-950/92 px-3 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 shadow-2xl shadow-black/50 backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-[1fr_1fr_64px_1fr_1fr] items-end gap-1">
        {navItems.slice(0, 2).map((item) => (
          <MobileNavLink
            key={item.label}
            {...item}
            active={pathname === item.href || pathname.startsWith(item.href)}
            badge={item.label === "Cart" ? cart.summary.count : undefined}
          />
        ))}

        <button
          type="button"
          onClick={simulateQrScan}
          className="mx-auto flex size-14 -translate-y-3 items-center justify-center rounded-full border border-emerald-200/30 bg-emerald-400 text-zinc-950 shadow-[0_18px_45px_rgba(16,185,129,0.32)] transition active:translate-y-[-0.55rem]"
          aria-label="Simulate QR scan"
        >
          <QrCode className="size-6" aria-hidden="true" />
        </button>

        {navItems.slice(2).map((item) => (
          <MobileNavLink
            key={item.label}
            {...item}
            active={pathname === item.href || pathname.startsWith(item.href)}
          />
        ))}
      </div>
    </nav>
  );
}

type MobileNavLinkProps = (typeof navItems)[number] & {
  active: boolean;
  badge?: number;
};

function MobileNavLink({
  active,
  badge,
  href,
  icon: Icon,
  label,
}: MobileNavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium text-zinc-500 transition",
        active && "bg-white/[0.06] text-emerald-200"
      )}
    >
      <span className="relative">
        <Icon className="size-5" aria-hidden="true" />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-2 -top-2 flex min-w-4 items-center justify-center rounded-full bg-orange-400 px-1 text-[10px] font-bold leading-4 text-zinc-950">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span>{label}</span>
    </Link>
  );
}
