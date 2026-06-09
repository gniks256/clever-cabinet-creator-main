import { create } from "zustand";
import type { CabinetConfig, SelectedCell } from "../components/configurator/types";
import { createDefaultColumns, migrateConfig } from "../components/configurator/types";

const INITIAL: CabinetConfig = migrateConfig({
  height: 1800,
  width: 1200,
  depth: 400,
  columns: createDefaultColumns(1, 1200, 1800, 16, 16, 16, 16, 16),
  texture: "white",
  globalThickness: 16,
  assemblyType: "top-bottom-overlap",
  outerPanels: {
    top: { isVisible: true },
    bottom: { isVisible: true },
    left: { isVisible: true },
    right: { isVisible: true },
  },
  backPanel: {
    type: "none",
    grooveInset: 20,
  },
  base: {
    type: "none",
    height: 100,
  },
});

interface CabinetStore {
  config: CabinetConfig;
  selected: SelectedCell[];
  past: CabinetConfig[];
  future: CabinetConfig[];

  setConfig: (newConfig: CabinetConfig | ((prev: CabinetConfig) => CabinetConfig)) => void;
  setSelected: (selected: SelectedCell[] | ((prev: SelectedCell[]) => SelectedCell[])) => void;

  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
}

export const useCabinetStore = create<CabinetStore>((set, get) => ({
  config: INITIAL,
  selected: [],
  past: [],
  future: [],

  setConfig: (updater) =>
    set((state) => {
      const nextConfig = typeof updater === "function" ? updater(state.config) : updater;
      return { config: migrateConfig(nextConfig) };
    }),

  setSelected: (updater) =>
    set((state) => {
      const nextSelected = typeof updater === "function" ? updater(state.selected) : updater;
      return { selected: nextSelected };
    }),

  saveHistory: () =>
    set((state) => {
      const lastPast = state.past[state.past.length - 1];
      if (lastPast && JSON.stringify(lastPast) === JSON.stringify(state.config)) return state;

      return {
        past: [...state.past, state.config].slice(-30),
        future: [],
      };
    }),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state;

      // Check if the current config is exactly the same as the top of the past stack
      const isCurrentInPast =
        JSON.stringify(state.past[state.past.length - 1]) === JSON.stringify(state.config);

      if (isCurrentInPast) {
        if (state.past.length <= 1) return state;
        const previousConfig = state.past[state.past.length - 2];
        const newPast = state.past.slice(0, -1);
        return {
          past: newPast,
          future: [...state.future, state.config],
          config: previousConfig,
        };
      } else {
        const previousConfig = state.past[state.past.length - 1];
        return {
          past: state.past, // Don't pop it if we haven't saved current state yet (but we usually save on debounce)
          future: [...state.future, state.config],
          config: previousConfig,
        };
      }
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;

      const nextConfig = state.future[state.future.length - 1];
      const newFuture = state.future.slice(0, -1);

      return {
        past: [...state.past, state.config],
        future: newFuture,
        config: nextConfig,
      };
    }),
}));
