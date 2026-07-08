"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const DONE_KEY = "rt_tour_done";

const steps = [
  {
    popover: {
      title: "Welcome to RentTok 👋",
      description: "Find rooms, PGs, flats and hostels across Gangtok — verified and easy to reserve.",
    },
  },
  {
    popover: {
      title: "Search & filter",
      description: "Browse by area, budget (price slider), room type and amenities — or tap “Near me” to see the closest stays.",
    },
  },
  {
    popover: {
      title: "Save & revisit",
      description: "Tap the ♥ on any building to add it to your wishlist, and find places again under “Recently viewed”.",
    },
  },
  {
    popover: {
      title: "Send a request",
      description: "Found a room? Send a request to join the owner’s queue — they’ll reach out to you directly, and you can call them once you’ve requested.",
    },
  },
  {
    popover: {
      title: "You’re all set! 🏔️",
      description: "Explore listings and connect with owners. Happy room hunting!",
    },
  },
];

function runTour() {
  const d = driver({
    showProgress: true,
    steps,
    onDestroyed: () => localStorage.setItem(DONE_KEY, "1"),
  });
  d.drive();
}

// Runs once for new visitors; also re-runnable via a `rt:tour` window event.
export function Walkthrough() {
  useEffect(() => {
    const onManual = () => runTour();
    window.addEventListener("rt:tour", onManual);

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!localStorage.getItem(DONE_KEY)) {
      timer = setTimeout(runTour, 900);
    }
    return () => {
      window.removeEventListener("rt:tour", onManual);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
