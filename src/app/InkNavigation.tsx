"use client";
import "./ink-navigation/navigation.css";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { mountInkNavigation } from "./ink-navigation/controller";

export default function InkNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const controller = useRef<ReturnType<typeof mountInkNavigation> | null>(null);
  useEffect(() => {
    const mounted = mountInkNavigation(router);
    controller.current = mounted;
    return () => { mounted.dispose(); controller.current = null; };
  }, [router]);
  useEffect(() => { controller.current?.commit(pathname); }, [pathname, router]);
  return null;
}
