# Auditoría del pipeline de LLM (Gemini)

Este documento explica, en criollo, qué le pedimos a Gemini en cada paso de SocratesAI, con qué parámetros, qué formato de salida esperamos, y dónde está el punto frágil de cada etapa. Es la referencia para entender "qué hace el LLM y cómo devuelve el feedback" sin tener que leer cada prompt entero cada vez.

**Mantené este documento actualizado**: si tocás cualquier prompt de `src/lib/prompts.ts` o la lógica de fallback en `gemini-analysis.ts` / `evaluate/route.ts` / `chat/route.ts`, actualizá también la sección correspondiente acá.

Para medir volatilidad de forma concreta (no solo leer el prompt), ver `scripts/eval-harness/README.md`.

---

## [RESUELTO 2026-07-27] Punto frágil transversal: ningún parámetro de generación estaba seteado

Las llamadas a Gemini del proyecto (tutor, evaluación, análisis agregado, chat de repreguntas del dashboard docente) usaban `generateText`/`streamText` sin `temperature` — corrían con el default del SDK/modelo (~1.0). Esto explicaba buena parte de la volatilidad entre corridas.

**Ahora está centralizado en `src/lib/gemini-analysis.ts`**:

```ts
export const TUTOR_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
export const ANALYSIS_MODELS = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
export const TEMPERATURES = { tutor: 0.4, analysis: 0.2 };
```

- **Tutor** (conversacional, streaming, se llama muchas veces por sesión) → `TUTOR_MODELS` + `temperature: 0.4`. Se prioriza que siga sonando natural, con menos variabilidad que antes pero sin volverse robótico.
- **Evaluación individual y análisis agregado** (se llaman una sola vez por sesión/unidad, son el feedback real que ven alumno y profesora) → `ANALYSIS_MODELS` (con `gemini-2.5-pro` como modelo principal, más caro pero de mejor calidad) + `temperature: 0.2`, bastante más determinista.
- El chat de repreguntas del dashboard docente (`professor/chat/route.ts`) también se migró a `TUTOR_MODELS` (mismos modelos que el tutor, mismos costos) pero con `temperature: TEMPERATURES.analysis` (0.2), porque es Q&A fáctico sobre un análisis ya generado, no conversación abierta.

`generateWithFallback()` acepta ahora `options?: { models?, temperature? }`; sin opciones, usa `ANALYSIS_MODELS`/`0.2` como default (cubre `/api/summary` y `/api/professor/subjects/[id]/summary` sin que haya hecho falta tocar esos archivos).

Estos son valores de partida informados por research, no números "finales" — se validan con `scripts/eval-harness/` (que ahora soporta `--temperature`/`--models` para A/B testear antes de cambiar los defaults de producción).

**De paso se eliminó una inconsistencia real**: `evaluate/route.ts` tenía su propia copia duplicada de `MODELS`/`generateWithFallback` en vez de reusar la de `gemini-analysis.ts` — ya no. `chat/route.ts` y `professor/chat/route.ts` también tenían cada uno su propio `MODELS` local — los tres ahora importan `TUTOR_MODELS`/`ANALYSIS_MODELS` de una única fuente.

**Causa real de la caída de calidad del fallback**: no era que `gemini-2.5-flash` fallara — probando el harness confirmamos que el error real es `Quota exceeded ... free_tier_requests`, o sea que la API key está en el tier gratuito de Google AI Studio, con límites bajos e impredecibles. El fallback a `gemini-2.5-flash-lite` (peor calidad, según lo percibido por Martina) se disparaba por agotamiento de cuota, no por una falla real del modelo principal. La solución de fondo es habilitar facturación en el proyecto de Google AI Studio asociado a `GOOGLE_GENERATIVE_AI_API_KEY` (acción manual, no de código) — eso sube los límites y el fallback debería dejar de dispararse en el uso normal.

**Gemini 3 — evaluado, pospuesto**: `@ai-sdk/google@3.0.63` (ya instalado, sin necesidad de actualizar nada) ya soporta modelos Gemini 3 (`gemini-3-flash-preview`, `gemini-3-pro-preview`, `gemini-3.1-*`). Se decidió no incorporarlos todavía porque son todos `-preview` (riesgo de que Google los cambie/deprecie sin aviso). Queda como próximo paso: probarlos con volumen vía `scripts/eval-harness/ --models gemini-3-flash-preview,...` antes de considerar promoverlos a producción.

---

## 1. Tutor socrático (preguntas durante la sesión)

**Dónde vive**: `getTutorPrompt()` en `src/lib/prompts.ts`, usado en `src/app/api/chat/route.ts`.

**Qué se le pide**: dado el contenido de un PDF, actuar como tutor socrático — identificar internamente 5-6 conceptos clave (menos si hay poco tiempo), hacer 2-3 preguntas por concepto, nunca validar una respuesta incorrecta, nunca explicar de más, terminar siempre el turno con una pregunta (salvo en el cierre).

**Inputs**: `contenidoPdf` (texto completo del/los PDF(s) de la materia), `contextoAdicional` (opcional, texto libre del alumno), `tiempoTotalMinutos` (determina cuántos conceptos cubrir: 1-2 si ≤10 min, 3-4 si ≤20 min, 5-6 si más o si es modo práctica), `practiceMode`. Cuando quedan <2 min de sesión (y no es modo práctica), `chat/route.ts` le agrega una instrucción extra de cierre al final del prompt.

**Modelo**: `TUTOR_MODELS` = `gemini-2.5-flash` → fallback `gemini-2.5-flash-lite` si falla. Streaming (`streamText`). `temperature: 0.4` (`TEMPERATURES.tutor`, ver arriba).

**Formato de salida esperado**: texto libre en español rioplatense, 2-4 oraciones por turno (hasta 5-6 si incluye una explicación), siempre terminando en pregunta (excepto cierre). No hay ninguna validación en runtime de que efectivamente cumpla esto — se confía 100% en que el modelo siga la instrucción.

**Puntos frágiles conocidos**:
- Nada verifica en runtime la regla más importante del prompt ("nunca validar una respuesta incorrecta"). El harness ya mostró, en una corrida de prueba, un caso donde el tutor respondió "¡Excelente! Entendiste muy bien la lógica" a una respuesta que en realidad invertía el orden de la resta en Diferencias en Diferencias (error conceptual real). Esto es exactamente el tipo de falla que hay que cuantificar (¿cuán seguido pasa?) antes de decidir si hace falta un paso de verificación adicional. Bajar la temperatura no soluciona esto — es un problema de instrucción/verificación, no de determinismo.
- La primera pregunta del tutor (mismo material, mismo tiempo) sigue variando entre alumnos distintos incluso con `temperature` más baja — eso reduce la temperatura no lo elimina. Si hace falta más consistencia ahí, la opción más robusta sería cachear/precomputar la apertura por materia en vez de regenerarla en cada sesión (implicaría persistencia nueva — no se implementó, queda pendiente de decisión).
- **[RESUELTO 2026-07-28] El tutor evalúa por coincidencia literal con el material, no por concepto.** Confirmado con una sesión real (material: Método de Control Sintético): la sección "CÓMO REACCIONAR A LAS RESPUESTAS" del prompt hace que el modelo compare la respuesta del estudiante contra frases específicas del PDF, y rechace respuestas conceptualmente correctas (o incluso más precisas que el material) simplemente porque no matchean el texto exacto. Ejemplos reales: "series de tiempo" tratado como insuficiente frente a "datos agregados o macro"; "trasladable a otras unidades" rechazado por no estar literalmente en el material, repitiendo la misma frase poco informativa varias veces. Se corrigió redefiniendo explícitamente en `getTutorPrompt` (secciones `FUENTE Y ALCANCE`, `REGLA CRÍTICA: VERIFICAR ANTES DE VALIDAR` y `CÓMO REACCIONAR A LAS RESPUESTAS`) qué significa "correcta": conceptualmente consistente con el material, no coincidencia literal de palabras — el estudiante puede parafrasear, dar ejemplos propios o extender la idea con una consecuencia lógica válida no dicha palabra por palabra, y eso sigue siendo correcto. Solo se marca como incorrecta/incompleta si contradice el material o refleja una confusión conceptual real (orden invertido, causa/efecto confundido, definición mal aplicada). Se agregó un ejemplo concreto (el caso real de "series de tiempo") directamente en el prompt para anclar el criterio.
- **[RESUELTO 2026-07-28] El tutor repite la misma pregunta reformulada sobre un punto ya contestado bien, y no reacciona cuando el alumno se lo señala.** Confirmado con una sesión real: el alumno explicó correctamente varias veces la misma idea (los pesos W y V del control sintético) y el tutor siguió re-preguntando lo mismo con otras palabras, incluso después de que el alumno dijera explícitamente "es la tercera vez que te lo explico" / "esto es repetitivo" / "me cansaste, redondea" — y ni en ese último caso el tutor cerró sin abrir una pregunta nueva. Vivía principalmente en `REGLA DE AVANCE` (el chequeo de "2 preguntas seguidas correctas" era sobre "el mismo concepto" en general, no sobre si un sub-punto puntual ya fue contestado bien) y en que `getTutorPrompt` no tenía ninguna sección de cierre dedicada ni instrucción para reaccionar a señales explícitas de hartazgo/pedido de cerrar. Se corrigió: `REGLA DE AVANCE` ahora aclara que preguntar sobre distintos ángulos del mismo concepto (mecanismo general → un componente → otro componente relacionado) sigue contando para el mismo contador, no lo reinicia; y que si el alumno señala explícitamente que ya contestó algo, el tutor debe releer el historial real (no ceder automáticamente) y avanzar si de verdad ya estaba cubierto. Se agregó una sección nueva, `SI EL ESTUDIANTE PIDE CERRAR O SE MUESTRA CANSADO`, que instruye a cerrar de inmediato con una síntesis breve sin abrir un tema nuevo cuando el alumno lo pide explícitamente o muestra hartazgo genuino — se marcó como excepción a la regla de "todo turno termina en pregunta". También se ajustó "Si el estudiante sigue equivocado después de varias repreguntas": ya no se le pide que reformule inmediatamente lo que se le acaba de explicar (podía sentirse repetitivo); alcanza con conectar la corrección con la siguiente pregunta. Probado a mano contra el tutor real replicando los tres tramos de la sesión: el pedido explícito de cierre ("me cansaste, redondea") ahora cierra con una síntesis breve sin pregunta nueva; el chequeo de regresión (corregir un error real y luego conectar con la siguiente pregunta) sigue funcionando.
- **[RESUELTO 2026-07-28] El tutor acepta que el alumno mezcle bajo una sola etiqueta dos opciones que el material distingue, y repite él mismo la mezcla.** Detectado en Simulación 3 (material: Control Sintético). Al preguntar por las formas de elegir el vector `V`, el material lista 4 opciones distintas (slide 10), donde la opción 3 (maximizar ajuste in-sample, vía minimización del MSPE) y la opción 4 (maximizar ajuste out-of-sample, vía validación cruzada) son métodos separados. El alumno respondió "cross validation in sample/out of sample" como si fuera un único método, y el tutor no solo no señaló la mezcla sino que la repitió ("la validación cruzada (in-sample/out-of-sample)"). No es el mismo caso que el punto anterior (no es literalismo de palabras): acá se perdió una distinción real que el material sí hace. Se agregó un párrafo nuevo en `REGLA CRÍTICA: VERIFICAR ANTES DE VALIDAR` que instruye a, ante preguntas de enumerar/distinguir varias opciones del material, verificar que la respuesta mantenga esa separación y — si no la mantiene — aclarar la distinción en la propia respuesta del tutor sin exigirle al alumno una repregunta extra para separarlas (si tuviera más para decir, ya lo habría dicho).

---

## 2. Evaluación individual (feedback al alumno + resumen para la profesora)

**Dónde vive**: `getCombinedEvaluationPrompt()` en `src/lib/prompts.ts`, usado en `src/app/api/evaluate/route.ts`.

**Qué se le pide**: en una sola llamada, generar DOS textos separados por el marcador literal `===RESUMEN_PROFESOR===`. Cada texto tiene 5 secciones obligatorias: (1) resumen de la sesión, (2) conceptos dominados, (3) conceptos a reforzar/confusiones (específico, no etiquetas vagas), (4) preguntas abiertas, (5) sugerencias de estudio referenciadas al material. El primero en segunda persona para el alumno, el segundo en tercera persona para la profesora. Instrucción explícita de ser "DIRECTO y HONESTO", no complaciente.

**Inputs**: transcripción completa de la conversación (formateada como `Estudiante: ...` / `Tutor: ...`, **incluyendo el mensaje disparador interno** `"[El estudiante acaba de unirse..."`, que nunca se filtra antes de mandarlo a evaluar — solo se filtra al mostrar la transcripción en pantalla), `contenidoPdf`, `contextoAdicional`, duración (planeada vs. real).

**Modelo**: `ANALYSIS_MODELS` = `gemini-2.5-pro` → `gemini-2.5-flash` → `gemini-2.5-flash-lite`, vía `generateWithFallback` de `gemini-analysis.ts` (ya no tiene copia duplicada, ver nota arriba). `temperature: 0.2` (`TEMPERATURES.analysis`). `generateText` (no streaming).

**Cómo se parsea la salida** — este es el punto más frágil de todo el pipeline:
```
const parts = combined.split(EVALUATION_SEPARATOR);
const studentFeedback = stripPreamble(parts[0]?.trim() ?? combined);
const professorSummary = parts[1] ? stripPreamble(parts[1].trim()) : null;
```
- Si el modelo **no incluye** el marcador `===RESUMEN_PROFESOR===` (o lo incluye más de una vez), `parts[1]` es `undefined` y `professorSummary` queda `null` **en silencio** — sin reintento, sin log de error visible, sin aviso al usuario. La profesora simplemente no tiene resumen de esa sesión y nadie se entera de por qué.
- `stripPreamble()` corta todo lo que esté antes de la primera línea que empiece con `#`, `##`, `###` o contenga `**` — asumiendo que el modelo va a usar headings/negrita para marcar el inicio del contenido real. En una corrida de prueba del harness, el modelo devolvió las 5 secciones como **prosa corrida sin ningún heading ni negrita** — en ese caso `stripPreamble` no encuentra nada que cortar (lo cual está bien, no había preámbulo), pero tampoco hay forma de saber después, mirando el texto guardado, si el modelo estructuró la respuesta como se le pidió o no.
- No hay ninguna validación de que las 5 secciones estén efectivamente presentes. Si el modelo se salta una, nadie lo detecta hasta que un humano lee el feedback.

**Qué se persiste y qué no**: `professorSummary` se guarda en `sessions.professor_summary` (Supabase). El `studentFeedback` **no se persiste en ningún lado** — solo se devuelve en la respuesta HTTP y se muestra en `/session/[id]/feedback`. Si el alumno no lo exporta a PDF, no queda ningún registro de qué feedback recibió.

---

## 3. Análisis agregado por unidad/materia (dashboard docente)

**Dónde vive**: `getAggregateSummaryPrompt()` en `src/lib/prompts.ts`, usado por `src/app/api/summary/route.ts` (legacy, agrupa por `pdf_name`) y `src/app/api/professor/subjects/[id]/summary/route.ts` (agrupa por `subject_id`). Ambos endpoints son casi idénticos.

**Qué se le pide**: a partir de los `professor_summary` de N sesiones individuales de una unidad/materia (opcionalmente filtradas por carrera/año/género), generar un análisis grupal con 5 secciones: panorama general, temas principales, diagnóstico de comprensión por tema, patrones por perfil demográfico, y recomendaciones para la próxima clase. Nunca debe mencionar desempeño individual de ningún alumno.

**Modelo**: `ANALYSIS_MODELS` (mismo fallback que la evaluación individual, `gemini-2.5-pro` como principal) vía `generateWithFallback` de `src/lib/gemini-analysis.ts`. `temperature: 0.2`.

**Cómo se parsea**: delimitador `===RECOMENDACIONES===` inmediatamente antes de la sección 5. Mismo patrón de fallback silencioso que en la evaluación individual: si el delimitador no aparece, `recommendations` queda `undefined` y `summary` se guarda como el texto completo sin separar. El dashboard docente muestra `recommendations` en un box destacado arriba — si viene vacío, esa sección simplemente no aparece, sin error visible.

**Cacheado**: el resultado se guarda en la tabla `unit_analysis` (`pdf_name`+`filter_key` o `subject_id`+`filter_key`). Esto significa que la volatilidad de este paso importa menos en el uso diario (no se regenera en cada visita al dashboard) — pero cada vez que la profesora usa el botón "Regenerar" con los mismos filtros, puede notar que el análisis cambia de forma no despreciable respecto a la vez anterior, sin que haya cambiado ninguna sesión nueva.

---

## Resumen de puntos frágiles

1. ~~Ningún parámetro de generación seteado en ninguna llamada~~ — **resuelto 2026-07-27**, ver arriba (`TEMPERATURES`/`TUTOR_MODELS`/`ANALYSIS_MODELS`).
2. Parseo por delimitador de texto plano, sin validación ni reintento, en evaluación individual (`===RESUMEN_PROFESOR===`) y en análisis agregado (`===RECOMENDACIONES===`) — sigue fallando en silencio. No se tocó en esta ronda.
3. El tutor no tiene ninguna verificación en runtime de su propia regla más crítica ("nunca validar una respuesta incorrecta"). No se tocó en esta ronda.
4. El feedback que ve el alumno (`studentFeedback`) no se persiste — no hay forma de auditar después de los hechos qué feedback recibió una sesión específica. No se tocó en esta ronda.
5. ~~`evaluate/route.ts` mantiene una copia duplicada de `generateWithFallback`~~ — **resuelto 2026-07-27**, junto con la misma duplicación que también tenían `chat/route.ts` y `professor/chat/route.ts`.
6. **Nuevo**: la primera pregunta del tutor no es consistente entre alumnos con el mismo material — bajar la temperatura ayuda parcialmente pero no la fija. Pendiente de decisión (ver sección 1 de arriba).

Próximo paso sugerido: usar `scripts/eval-harness/` con volumen real (varias personas x varias sesiones) y unas sesiones manuales reales (via `--replay-transcript`, jugadas en la preview de Vercel) para confirmar que estos cambios efectivamente bajaron la volatilidad medida, y recién ahí atacar los puntos 2, 3 y 4.
