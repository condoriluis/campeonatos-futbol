"use server";

import { cookies } from "next/headers";

const KEY = "panel_nav_collapsed";

export async function persistPanelNavCollapsed(value: "1" | "0") {
  (await cookies()).set(KEY, value, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}