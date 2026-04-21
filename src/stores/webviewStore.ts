import { create } from 'zustand';

interface WebViewState {
  reloadKey: number;
  reload: () => void;
}

export const useWebViewStore = create<WebViewState>((set) => ({
  reloadKey: 0,
  reload: () => set((s) => ({ reloadKey: s.reloadKey + 1 })),
}));
