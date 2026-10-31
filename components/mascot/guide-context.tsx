"use client";

import { createContext, useContext } from "react";
import { DEFAULT_GUIDE_PREFERENCES, type GuidePreferences } from "@/lib/mascot-guide";

type GuideContextValue = {
  preferences: GuidePreferences;
  ready: boolean;
  authenticated: boolean;
  updatePreferences: (patch: Partial<GuidePreferences>) => void;
  startTour: () => void;
};
export const GuideContext = createContext<GuideContextValue>({ preferences: DEFAULT_GUIDE_PREFERENCES, ready: false, authenticated: false, updatePreferences: () => {}, startTour: () => {} });
export const useMascotGuide = () => useContext(GuideContext);
