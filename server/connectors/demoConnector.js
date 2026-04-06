import { sampleCsv } from "../../src/sampleData.js";

export const demoConnector = {
  id: "demo",
  name: "Dataset demo seguro",
  mode: "builtin",
  configured: true,
  docsUrl: "local-demo",
  notes: "Fuente local incluida en el proyecto. Ideal para demos, pruebas y desarrollo sin dependencia externa.",
  async loadDataset() {
    return {
      csvText: sampleCsv,
      metadata: {
        sourceLabel: this.name,
        coverage: "Demo local"
      }
    };
  }
};
