"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

export function HeaderActions({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();

  if (isLoggedIn) {
    return (
      <Button asChild size="sm">
        <Link href="/panel">Panel</Link>
      </Button>
    );
  }

  // Hide the "Ingresar" button on the /nomina/... routes
  if (pathname.startsWith("/nomina/")) {
    return null;
  }

  return (
    <Button asChild size="sm" variant="outline">
      <Link href="/login">Ingresar</Link>
    </Button>
  );
}
