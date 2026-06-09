import { createStore } from "zustand/vanilla";
const store = createStore((set) => ({
  config: { width: 1000, columns: [{ id: "c1", width: 1000 }] },
  setConfig: (config) => set({ config }),
}));

function getInnerWidth(c) {
  return c.width;
}
let config = store.getState().config;

function handleConfigChange(newConfig) {
  const finalConfig = { ...newConfig };
  const innerWChanged = getInnerWidth(newConfig) !== getInnerWidth(config);
  // ... other checks
  if (false) {
  } else if (newConfig.width !== config.width || innerWChanged) {
    console.log("Width changed!");
  }
  store.getState().setConfig(finalConfig);
}

console.log("Initial columns:", store.getState().config.columns.length);
handleConfigChange({
  ...config,
  columns: [
    { id: "c1", width: 500 },
    { id: "c2", width: 500 },
  ],
});
console.log("New columns:", store.getState().config.columns.length);
