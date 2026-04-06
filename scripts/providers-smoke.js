import { listConnectors, loadDatasetFromConnector } from "../server/connectors/index.js";

const providers = listConnectors();
const demo = await loadDatasetFromConnector("demo", {});

console.log(JSON.stringify({
  providers,
  demoPreview: demo.csvText.split("\n").slice(0, 3)
}, null, 2));
