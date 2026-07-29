# Eval harness — medición de volatilidad del feedback del tutor

Herramienta local para medir qué tan consistente es el feedback que genera SocratesAI (alumno + profesora), **antes** de tocar ningún prompt de producción. No es parte de la app: no se despliega, no toca Supabase, todo el output queda en archivos locales bajo `results/` (gitignoreado).

Reusa literalmente el código real de producción (`src/lib/prompts.ts`, `src/lib/gemini-analysis.ts`) para que lo que mide sea el comportamiento real, no una reimplementación.

## Requisitos

- `.env.local` en la raíz del repo con `GOOGLE_GENERATIVE_AI_API_KEY` (igual que para `npm run dev`).

## Modo sintético (alumno simulado con Gemini)

```bash
npm run eval:harness -- \
  --pdf "C:\ruta\a\material_real.pdf" \
  --personas alumno_ejemplar,alumno_confundido,alumno_no_leyo \
  --sessions-per-persona 2 \
  --turns 8 \
  --minutes 20 \
  --eval-repeats 4 \
  --out mi-corrida-1
```

Todos los flags son opcionales:

| Flag | Default | Qué hace |
|---|---|---|
| `--pdf <path>` | (ninguno) | PDF real a usar como material. Si se omite, usa `fixtures/material-fallback.txt` (un texto corto sobre Diferencias en Diferencias, solo para poder correr un smoke test sin tener un PDF a mano). |
| `--personas a,b,c` | `alumno_ejemplar,alumno_confundido,alumno_no_leyo` | Ver personas disponibles abajo. |
| `--sessions-per-persona <n>` | `1` | Cuántas sesiones distintas simular por persona (transcripts distintos = volatilidad punta a punta). |
| `--turns <n>` | `6` | Cantidad de intercambios tutor↔alumno por sesión. El último turno simula la fase de cierre real. |
| `--minutes <n>` | `20` | `timeMinutes` que se le pasa al tutor (afecta cuántos conceptos identifica internamente). |
| `--practice` | `false` | Modo práctica (sin fase de cierre forzada). |
| `--eval-repeats <n>` | `3` | Cuántas veces se corre la evaluación **sobre el mismo transcript**, para medir la volatilidad propia del prompt de evaluación (aislada de la conversación). |
| `--out <nombre>` | `corrida-<timestamp>` | Subcarpeta de `results/` donde se guarda todo. |
| `--temperature <n>` | (default de producción: `0.4` tutor / `0.2` evaluación) | Override de A/B testing para esta corrida. Ej: `--temperature 1` reproduce el comportamiento viejo (sin `temperature` seteada, default del modelo) para comparar contra los nuevos defaults. |
| `--models a,b,c` | (default de producción: `TUTOR_MODELS`/`ANALYSIS_MODELS` de `src/lib/gemini-analysis.ts`) | Override de la cadena de modelos a probar, ej. para evaluar Gemini 3 sin tocar código de producción: `--models gemini-3-flash-preview,gemini-2.5-flash`. |

También podés crear `config.local.json` (gitignoreado) en esta carpeta con overrides personales, para no repetir flags. Tiene la misma forma que `config.default.json`. Prioridad: flags CLI > `config.local.json` > `config.default.json`.

### Personas disponibles (`personas.ts`)

- `alumno_ejemplar` — leyó el material, responde con precisión.
- `alumno_confundido` — leyó el material pero mezcla conceptos relacionados (errores concretos, no vagos). Se confunde puntualmente y se autocorrige rápido (a lo sumo un turno más) — no sirve para probar cómo reacciona el tutor ante una confusión sostenida.
- `alumno_confuso_ofuscado` — se traba en un concepto puntual durante varios turnos seguidos (no se autocorrige rápido ni "adivina" la respuesta), y se muestra cada vez más frustrado *con el concepto* a medida que no logra entenderlo — sin llegar a quejarse del tutor ni pedir cerrar la sesión (eso ya lo cubre reproducir la queja explícita a mano). Pensada para probar si el tutor adapta el ritmo/profundidad ante confusión sostenida, no solo ante rachas de acierto o hartazgo explícito.
- `alumno_no_leyo` — **no recibe el contenido del PDF**, para forzar respuestas vagas reales en vez de que el modelo "actúe" mal con el material completo a la vista.
- `alumno_mixto` — arranca débil en cada concepto y mejora tras la repregunta del tutor.

### Qué mide (`metrics.ts`)

Por cada corrida de evaluación (sobre el texto del alumno y el de la profesora):

- Si el delimitador `===RESUMEN_PROFESOR===` aparece exactamente una vez (`delimiterFound`). Esto reproduce el bug silencioso real de `src/app/api/evaluate/route.ts`: si falta, `professorSummary` queda `null` sin aviso.
- Presencia de las 5 secciones esperadas (por palabra clave, no por formato exacto — así se detecta cuando el modelo ni siquiera etiqueta las secciones).
- Word count de cada texto.
- Cuánto texto removió `stripPreamble` (preámbulo conversacional antes del primer heading/bold).
- Un extracto de la sección "a reforzar" de cada repeat, puesto lado a lado en `summary.md`, para eyeballear si el LLM señala los mismos conceptos débiles cada vez que se le pide evaluar el mismo transcript.

No hay scoring tipo LLM-as-judge todavía — es intencional, ver plan de la sesión que originó este harness.

### Output

```
results/<out>/
  run-config.json
  summary.md                          ← tabla comparativa + "a reforzar" lado a lado
  <personaId>/
    session-N/
      transcript.json                 ← mismo shape que SessionData.messages
      transcript.md
      eval-1-student.md / eval-1-professor.md / eval-1-raw.txt
      eval-2-... (uno por --eval-repeats)
      metrics.json
```

## Modo replay (sesión real jugada a mano)

Para correr el mismo pipeline de medición sobre una sesión real (no sintética):

1. Jugá una sesión normal en `npm run dev` hasta llegar a la pantalla de feedback.
2. **Antes de cerrar la pestaña**: abrí DevTools → Application → Local Storage → copiá el valor completo de la key `socrates_session`.
3. Pegalo en un archivo JSON, por ejemplo `manual-sessions/sesion-1.json` (carpeta gitignoreada, creala si no existe).
4. Corré:

```bash
npm run eval:harness -- --replay-transcript manual-sessions/sesion-1.json --eval-repeats 4 --out replay-sesion-1
```

Esto salta la generación de conversación y corre `evaluate-runner.ts` directo sobre ese transcript real, con las mismas métricas y el mismo `summary.md` que las sesiones sintéticas — así se puede comparar directamente si la volatilidad medida en sintéticas es representativa de sesiones reales.

Lo único que el harness no mide (intencionalmente, es la única parte que sigue siendo juicio humano en esta fase): si el feedback generado **se siente correcto y útil** para esa sesión real específica. Anotalo a mano en `manual-sessions/notas.md`.

## Nota de mantenimiento

Este harness duplica, con comentarios explícitos de "mantener sincronizado", dos piezas de lógica que viven en route handlers de Next.js y no se pueden importar directamente:

- El parseo de `===RESUMEN_PROFESOR===` + `stripPreamble` de `src/app/api/evaluate/route.ts` (en `evaluate-runner.ts`).
- El texto agregado en fase de cierre de `src/app/api/chat/route.ts` (en `session-runner.ts`).

Si se toca cualquiera de esos dos archivos, revisar si hay que actualizar también estas copias.
