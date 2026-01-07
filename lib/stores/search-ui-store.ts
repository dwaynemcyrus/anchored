import { create } from "zustand";

interface SearchUiState {
  isSearchOpen: boolean;
  setSearchOpen: (next: boolean) => void;
}

export const useSearchUiStore = create<SearchUiState>((set) => ({
  isSearchOpen: false,
  setSearchOpen: (next) => set({ isSearchOpen: next }),
}));
