import { demoConnector } from "./demoConnector.js";
import { footballDataConnector } from "./footballDataConnector.js";
import { sportmonksConnector } from "./sportmonksConnector.js";
import { createProviderError } from "./shared.js";

const connectors = [demoConnector, footballDataConnector, sportmonksConnector];

export function listConnectors() {
  return connectors.map((connector) => ({
    id: connector.id,
    name: connector.name,
    mode: connector.mode,
    configured: connector.configured,
    docsUrl: connector.docsUrl,
    notes: connector.notes
  }));
}

export async function loadDatasetFromConnector(sourceId, params) {
  const connector = connectors.find((item) => item.id === sourceId);

  if (!connector) {
    throw createProviderError(`No existe el conector ${sourceId}.`, 404);
  }

  return connector.loadDataset(params);
}
