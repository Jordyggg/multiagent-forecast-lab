# Multiagent Forecast Lab

Aplicacion web interactiva para explorar decisiones con un enfoque multiagente y una capa de conectores de datos legalmente segura.

## Que cambio en esta iteracion

- Eliminamos la idea de depender de Flashscore como fuente base.
- El proyecto ahora prioriza `CSV manual` y `APIs oficiales`.
- La UI incorpora un selector de fuente de datos.
- El servidor ahora expone un catalogo de conectores y carga datasets por API.
- Los tokens se mantienen del lado servidor, no en el navegador.

## Fuentes seguras soportadas hoy

- `Dataset demo seguro`: incluido localmente para desarrollo y demos.
- `football-data.org`: conector oficial listo para usarse con `FOOTBALL_DATA_API_TOKEN`.
- `Sportmonks`: scaffold preparado para una futura integracion de estadisticas avanzadas.

## Por que esta direccion es mejor

La aplicacion sigue apuntando a una experiencia tipo GitHub-star, pero sin construir sobre una fuente con riesgo legal. La arquitectura ahora separa:

- `UI`: experiencia interactiva.
- `Motor multiagente`: debate, consenso y prediccion.
- `Conectores`: cada proveedor tiene su propio modulo.
- `Servidor`: protege tokens y normaliza la data.

## Como abrirlo

1. En terminal, entra a `C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab`.
2. Si vas a usar un proveedor oficial, copia `.env.example` a tu entorno y configura el token.
3. Ejecuta `npm start`.
4. Abre `http://localhost:3000`.

## Variables de entorno

Consulta [\.env.example](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\.env.example).

Variables disponibles:

```text
FOOTBALL_DATA_API_TOKEN=
SPORTMONKS_API_TOKEN=
PORT=3000
```

## Smoke tests

```bash
npm run smoke
npm run smoke:providers
```

## Conector football-data.org

Este conector usa el endpoint oficial de partidos por equipo y transforma la respuesta al formato interno del laboratorio. Referencia oficial: [football-data.org Quickstart](https://www.football-data.org/documentation/quickstart).

Parametros que hoy entiende la UI:

- `Team IDs proveedor`: por ejemplo `57,64`
- `Temporada`: por ejemplo `2024`
- `Competicion / liga`: por ejemplo `PL`

Nota: esta fuente es excelente para resultados, equipos y calendario. La cobertura de estadisticas avanzadas como `xG` es menor, por eso el conector normaliza esos campos con valores seguros por defecto cuando no llegan.

## Conector Sportmonks

Quedo preparado en arquitectura porque su oferta oficial apunta muy bien a estadisticas avanzadas y cobertura amplia. Referencias oficiales:

- [Sportmonks](https://www.sportmonks.com/)
- [Documentacion Football API](https://docs.sportmonks.com/football)

En esta version aun no hago la integracion final porque necesitamos decidir el plan, endpoints exactos y el mapeo de estadisticas avanzadas.

## Arquitectura

- [index.html](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\index.html): interfaz principal.
- [server.js](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\server.js): servidor estatico + API interna de conectores.
- [server/connectors/index.js](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\server\connectors\index.js): registro de conectores.
- [server/connectors/footballDataConnector.js](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\server\connectors\footballDataConnector.js): conector oficial para football-data.org.
- [server/connectors/sportmonksConnector.js](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\server\connectors\sportmonksConnector.js): scaffold para estadisticas avanzadas.
- [server/connectors/demoConnector.js](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\server\connectors\demoConnector.js): dataset local.
- [src/app.js](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\src\app.js): flujo de UI, importacion de fuentes y render.
- [src/agents.js](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\src\agents.js): motor de agentes, debate y consenso.
- [src/parser.js](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\src\parser.js): parser flexible con defaults para campos faltantes.
- [scripts/providers-smoke.js](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\scripts\providers-smoke.js): prueba del catalogo de proveedores.

## Siguiente evolucion tecnica

1. Completar el conector Sportmonks con estadisticas avanzadas reales.
2. Agregar cache local para no pedir la misma data varias veces.
3. Guardar escenarios y comparativas historicas.
4. Añadir backtesting para medir calidad predictiva por fuente.
5. Sumar mas workflows: trading, negocio, riesgo operativo, scouting.
