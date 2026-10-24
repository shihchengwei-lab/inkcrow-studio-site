"use client";

import { useEffect } from "react";
import { startWishProgress } from "./wish-progress";

export default function WishPresence() {
  useEffect(startWishProgress, []);
  return null;
}
