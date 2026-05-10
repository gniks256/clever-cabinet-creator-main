import { createFileRoute } from "@tanstack/react-router";
import { FurnitureConfigurator } from "../components/configurator/FurnitureConfigurator";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Cabinet Configurator — Design Your Storage" },
      {
        name: "description",
        content:
          "Interactive 2.5D furniture configurator with parametric grid, materials, and live pricing.",
      },
    ],
  }),
});

function Index() {
  return <FurnitureConfigurator />;
}
