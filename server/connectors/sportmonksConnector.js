import { createProviderError } from "./shared.js";

export const sportmonksConnector = {
  id: "sportmonks",
  name: "Sportmonks",
  mode: "official-api",
  configured: Boolean(process.env.SPORTMONKS_API_TOKEN),
  docsUrl: "https://docs.sportmonks.com/football",
  notes: "Conector reservado para una futura integracion de estadisticas avanzadas como xG. Requiere token y mapeo adicional por plan/endpoints.",
  async loadDataset() {
    if (!process.env.SPORTMONKS_API_TOKEN) {
      throw createProviderError("Configura SPORTMONKS_API_TOKEN para habilitar este conector.", 400);
    }

    throw createProviderError("El conector Sportmonks esta preparado en arquitectura, pero aun no esta implementado en esta version.", 501);
  }
};
