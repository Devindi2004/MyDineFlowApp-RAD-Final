"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type FavoritesState = {
  favoriteIds: string[];
  recentlyOrderedIds: string[];
  addRecent: (id: string) => void;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
};

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      recentlyOrderedIds: ["df-002", "df-008", "df-007"],
      addRecent: (id) =>
        set((state) => ({
          recentlyOrderedIds: [
            id,
            ...state.recentlyOrderedIds.filter((item) => item !== id),
          ].slice(0, 8),
        })),
      isFavorite: (id) => get().favoriteIds.includes(id),
      toggleFavorite: (id) =>
        set((state) => ({
          favoriteIds: state.favoriteIds.includes(id)
            ? state.favoriteIds.filter((item) => item !== id)
            : [id, ...state.favoriteIds],
        })),
    }),
    {
      name: "dineflow.favorites.v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
