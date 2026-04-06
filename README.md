# Multiagent Forecast Lab

Aplicacion web interactiva para explorar decisiones con un enfoque multiagente.

## Que hace esta primera version

- Permite escoger un modelo diferente para cada agente.
- Usa varios agentes especializados que colaboran y debaten.
- Lee datos historicos desde un CSV.
- Genera una prediccion explicable para un evento deportivo.
- Muestra senales, riesgo, confianza y un reporte exportable.
- Incluye un servidor local sin dependencias para abrir la app con seguridad en navegador.

## Por que esta idea es potente

La propuesta no es solo "un predictor". Es una capa de `decision intelligence`:

- Un agente mira el historial estructural.
- Otro mide momentum y cambios recientes.
- Otro revisa riesgo, volatilidad y lesiones.
- Otro discute el consenso para evitar pensamiento de rebano.
- Un sintetizador traduce todo en una decision accionable.

Eso le da una narrativa de producto fuerte para GitHub: colaboracion entre agentes, modelos configurables, explicabilidad y una experiencia visual clara.

## Como abrirlo

1. En terminal, entra a `C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab`.
2. Ejecuta `npm start` o `node server.js`.
3. Abre `http://localhost:3000`.
4. Usa el dataset demo o pega tu propio CSV.
5. Elige `Equipo / opcion A` y `Equipo / opcion B`.
6. Ajusta modelos y pesos de los agentes.
7. Haz clic en `Convocar agentes`.

## Smoke test

Puedes validar el motor sin interfaz con:

```bash
npm run smoke
```

## Formato del CSV

Encabezados esperados:

```text
date,team,opponent,location,team_score,opponent_score,shots_for,shots_against,xg_for,xg_against,injuries,market_odds
```

## Arquitectura

- [index.html](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\index.html): interfaz principal.
- [server.js](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\server.js): servidor local estatico sin dependencias.
- [src/app.js](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\src\app.js): estado, render y flujo interactivo.
- [src/agents.js](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\src\agents.js): motor de agentes, debate y consenso.
- [src/models.js](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\src\models.js): catalogo de modelos y sesgos base.
- [src/parser.js](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\src\parser.js): parser CSV y normalizacion.
- [src/sampleData.js](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\src\sampleData.js): dataset demo.
- [src/styles.css](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\src\styles.css): look and feel.
- [scripts/smoke-test.js](C:\Users\equipo\Dropbox\CHATGPT CODEX\multiagent-forecast-lab\scripts\smoke-test.js): prueba rapida del motor.

## Como llevarlo a un nivel GitHub-star

1. Conectar proveedores reales de IA por agente.
2. Agregar fuentes externas: APIs deportivas, bolsas, clima, redes sociales, noticias.
3. Guardar sesiones, escenarios y comparaciones historicas.
4. Permitir agentes personalizados creados por la comunidad.
5. Incluir backtesting para medir que tan bien predice el sistema.
6. Publicar una API y un modo colaborativo en tiempo real.

## Siguiente evolucion tecnica

La base ya esta separada para crecer hacia:

- `Model adapters`: OpenAI, Anthropic, Gemini, modelos locales.
- `Data connectors`: CSV, JSON, REST, scrapers, websockets.
- `Agent memory`: historial de debates y resultados.
- `Decision workflows`: deportes, trading, negocios, riesgo operativo, estrategia comercial.

## Nota

Esta version implementa un motor local explicable y deterministicamente reproducible. No finge llamar a modelos reales todavia; mas bien deja lista la arquitectura para conectarlos de forma limpia.
