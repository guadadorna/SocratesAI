# SocratesAI - Contexto del Proyecto

## Que es
App web de tutor socratico para la materia "Evaluacion de Programas y Proyectos". El estudiante sube material de una unidad (PDF) y el tutor le hace preguntas para diagnosticar comprension, siguiendo el metodo socratico: nunca da respuestas directas, siempre guia con preguntas y repreguntas.

El tutor:
- Identifica 5-6 conceptos clave del material
- Hace 2-3 preguntas por concepto
- Nunca valida respuestas incorrectas
- Habla en espanol rioplatense, tono cercano pero profesional
- Al final genera un diagnostico detallado por concepto

## Stack Tecnico
- **Framework**: Next.js 16 con App Router
- **Styling**: Tailwind CSS
- **AI**: Gemini via Vercel AI SDK (@ai-sdk/google)
  - Modelo principal: gemini-2.5-flash
  - Fallback: gemini-2.5-flash-lite
- **PDF parsing**: pdf2json
- **Deploy**: Vercel
- **Repo**: https://github.com/guadadorna/SocratesAI

## Estructura de Archivos Clave
- `src/app/page.tsx` - Landing/home
- `src/app/dashboard/page.tsx` - Dashboard del profesor
- `src/app/session/[id]/page.tsx` - Sesion de chat con el tutor
- `src/app/session/[id]/feedback/page.tsx` - Pagina de feedback post-sesion
- `src/app/api/chat/route.ts` - API del chat (streaming con Gemini)
- `src/app/api/evaluate/route.ts` - API de evaluacion/feedback final
- `src/app/api/upload/route.ts` - API para subir PDFs
- `src/lib/prompts.ts` - Prompts del tutor y evaluador
- `src/lib/session-store.ts` - Almacenamiento de sesiones
- `src/components/ChatWindow.tsx` - Componente del chat
- `src/components/Timer.tsx` - Timer de la sesion
- `docs/v2.1_tutor_socratico_ES.txt` - Prompt completo del tutor (240 lineas)

## Funcionalidades Actuales
1. **Subir PDF** - El profesor sube material de una unidad
2. **Formulario de intake** - Antes de la sesion, el alumno elige carrera, año y genero (anonimo, sin nombre)
3. **Sesion de tutoria** - Chat con timer, el tutor hace preguntas socraticas
4. **Modo practica** - Sesion sin temporizador, sin presion de tiempo
5. **Fase de cierre** - Cuando quedan <2 min, el tutor cierra la conversacion
6. **Feedback diferenciado** - Al terminar, genera un feedback para el alumno (segunda persona, tono cercano) y uno para la docente (tercera persona, formal), en una sola llamada a Gemini separada por delimitador
7. **Exportar feedback como PDF** - El usuario puede descargar el diagnostico en PDF
8. **Persistencia de sesiones** - Al terminar, la conversacion y el resumen del profesor se guardan en Supabase (conversacion anonimizada con Gemini)
9. **Render de LaTeX** - Las ecuaciones en el chat y en el feedback se renderizan correctamente (KaTeX)
10. **Endpoint /api/summary** - Genera un resumen agregado de todas las sesiones de una unidad (filtrado por pdf_name), con diagnostico por tema y desglose demografico (carrera, año, genero)

## Anonimizacion (CRITICO)
- Nunca se guarda nombre, email, legajo ni ningun dato personal
- Los datos demograficos (genero, carrera, anio) son categoriales, no identificatorios
- Antes de guardar en Supabase, la conversacion pasa por Gemini flash-lite que reemplaza PII con [DATO_PERSONAL]
- El ID de sesion es un UUID sin relacion con ningun usuario real

## Stack Tecnico
- **Framework**: Next.js 16 con App Router
- **Styling**: Tailwind CSS
- **AI**: Gemini via Vercel AI SDK (@ai-sdk/google)
  - Modelo principal: gemini-2.5-flash
  - Fallback: gemini-2.5-flash-lite
- **PDF parsing**: pdf2json
- **Base de datos**: Supabase (PostgreSQL)
- **Deploy**: Vercel
- **Repo**: https://github.com/guadadorna/SocratesAI

## Estructura de Archivos Clave
- `src/app/page.tsx` - Landing/home
- `src/app/dashboard/page.tsx` - Dashboard del profesor (sube PDF)
- `src/app/intake/[id]/page.tsx` - Formulario demografico anonimo (nuevo)
- `src/app/session/[id]/page.tsx` - Sesion de chat con el tutor
- `src/app/session/[id]/feedback/page.tsx` - Pagina de feedback post-sesion
- `src/app/api/chat/route.ts` - API del chat (streaming con Gemini)
- `src/app/api/evaluate/route.ts` - API de evaluacion/feedback final
- `src/app/api/upload/route.ts` - API para subir PDFs
- `src/app/api/sessions/save/route.ts` - API para guardar sesion en Supabase (nuevo)
- `src/lib/prompts.ts` - Prompts del tutor y evaluador
- `src/lib/session-store.ts` - Almacenamiento de sesiones (localStorage)
- `src/lib/supabase.ts` - Cliente de Supabase (nuevo)
- `src/lib/sanitize.ts` - Sanitizacion de PII con Gemini (nuevo)
- `src/components/ChatWindow.tsx` - Componente del chat
- `src/components/Timer.tsx` - Timer de la sesion

## Flujo de datos
Dashboard → /intake/[id] (datos demograficos) → /session/[id] (chat) → /feedback (guardar en Supabase + mostrar feedback)

## Limitaciones Conocidas
- Gemini 2.5 Flash a veces tiene alta demanda (hay fallback a 2.5-flash-lite)
- El parsing de PDF puede fallar con PDFs complejos o escaneados
- No hay autenticacion de usuarios (pendiente)
- El formulario de intake tiene estilo basico, pendiente pulir

## Variables de Entorno
- `GOOGLE_GENERATIVE_AI_API_KEY` - API key de Google AI Studio
- `SUPABASE_URL` - URL del proyecto Supabase
- `SUPABASE_ANON_KEY` - Clave publica de Supabase

## URLs
- **Produccion**: https://socratesai-two.vercel.app
- **Repo**: https://github.com/guadadorna/SocratesAI

---

## Pendientes / Ideas Futuras
- [ ] Pulir estilos del formulario de intake
- [x] Dashboard del profesor (frontend que consume /api/summary)
- [ ] Autenticacion de usuarios (profesor vs estudiante)
- [ ] Historial de sesiones por estudiante
- [ ] Mejorar parsing de PDFs escaneados (OCR)
- [ ] Permitir multiples unidades/materias

## Estructura de Archivos Clave (actualizada)
- `src/app/profesor/page.tsx` - Dashboard docente (server component con auth por PROFESOR_KEY)
- `src/app/profesor/ProfesorDashboard.tsx` - UI del dashboard (client component)
- `src/app/api/professor/units/route.ts` - Lista de materiales con stats por unidad
- `src/app/api/summary/route.ts` - Ahora acepta filtros `careers`, `years`, `genders` y retorna `demographics`

---

## Registro de Sesiones

### 2026-04-21 - Sesion con Claude
**Lo que se hizo:**
- Fix del error "Error al generar el feedback" en evaluate/route.ts
- Cambiado modelo fallback de gemini-2.0-flash a gemini-2.5-flash-lite (consistente con otras apps)
- Mejorado mensaje de error para mostrar el error real
- Cambiado en prompt de evaluador "Conceptos flojos" por "Conceptos a reforzar"

**Problemas encontrados:**
- El fallback gemini-2.0-flash no era el correcto, causaba fallo en evaluacion

### 2026-04-16 - Sesion con Claude
**Lo que se hizo:**
- Fix del error de modelo expirado: agregado fallback de gemini-2.5-flash a gemini-2.0-flash
- Actualizadas ambas APIs (chat y evaluate) con el patron de fallback
- Creacion de este archivo de contexto

**Problemas encontrados:**
- `gemini-2.5-flash` retornaba 503 por alta demanda
- No habia fallback, la app fallaba completamente

**Decisiones de diseno:**
- Usar 2.5 como principal (mejor razonamiento) con fallback a 2.5-flash-lite
- El fallback es transparente para el usuario

### 2026-05-13 - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Implementado modo "practica" sin temporizador: el usuario puede elegir hacer la sesion sin presion de tiempo
- Fix de colores en la UI (modo practica vs modo normal)
- Implementado fallback real para streaming con modelos Gemini (antes el fallback no funcionaba correctamente en streaming)
- Agregado logging al fallback de evaluate para facilitar debugging
- Fix del texto de feedback y modelo de fallback
- Implementada exportacion del feedback como PDF
- Agregada duracion real de la sesion en el feedback
- Render de markdown en el feedback (antes se mostraba texto plano con simbolos)

**Problemas encontrados:**
- El fallback de Gemini no estaba implementado correctamente para streaming, causaba errores silenciosos
- El feedback mostraba markdown sin renderizar

**Decisiones de diseno:**
- Modo practica es una opcion al iniciar sesion, no reemplaza el modo con timer
- La duracion real se calcula desde el inicio hasta el fin de la sesion

---

### 2026-05-16 - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Configurado Supabase con tabla `sessions` (gender, career, year, pdf_name, duration_minutes, mode, messages)
- Creado `src/lib/supabase.ts` - cliente de Supabase
- Creado `src/lib/sanitize.ts` - sanitizacion de PII con Gemini flash-lite antes de guardar
- Creado `src/app/api/sessions/save/route.ts` - endpoint que sanitiza y guarda en Supabase
- Creado `src/app/intake/[id]/page.tsx` - formulario demografico anonimo (carrera, año, genero)
- Modificado `dashboard/page.tsx` para redirigir a /intake/[id] antes de la sesion
- Modificado `session-store.ts` para incluir campo `demographic` en SessionData
- Modificado `feedback/page.tsx` para llamar al endpoint de guardado al terminar
- Verificado: las sesiones se guardan correctamente en Supabase con datos demograficos

**Filosofia de datos:**
- Guardar la conversacion cruda (messages) es mas valioso que el feedback (que se puede regenerar)
- El dashboard del profesor va a generar resumen on-demand a partir de las conversaciones

**Pendiente para proxima sesion:**
- Pulir estilos del formulario de intake (inconsistencias visuales con el resto de la app)
- Dashboard del profesor con listado y resumen de sesiones

---

### 2026-05-19 - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Agregada columna `professor_summary TEXT` a la tabla `sessions` en Supabase
- Reemplazados dos prompts separados (alumno/profesor) por `getCombinedEvaluationPrompt` en `prompts.ts`: una sola llamada a Gemini genera ambos textos separados por `===RESUMEN_PROFESOR===`
- Modificado `evaluate/route.ts` para usar el prompt combinado y separar el output
- Modificado `feedback/page.tsx` para orquestar: primero genera feedbacks, luego persiste en Supabase con el resumen del profesor
- Modificado `sessions/save/route.ts`: acepta `professor_summary`, cambiado `insert` por `upsert` para evitar error de clave duplicada al recargar la pagina
- Creado `src/app/api/summary/route.ts` - endpoint GET /api/summary?pdf=nombre.pdf que lee sesiones de Supabase y genera resumen agregado con desglose demografico
- Agregado `getAggregateSummaryPrompt` en `prompts.ts`
- Instalado remark-math, rehype-katex, katex; actualizado `ChatWindow.tsx` y `feedback/page.tsx` para renderizar LaTeX; agregado CSS de KaTeX en `layout.tsx`
- Revertida instruccion de contexto adicional en el prompt del tutor (causaba comportamiento condescendiente)
- Actualizado placeholder del campo de contexto adicional en `dashboard/page.tsx`

**Problemas encontrados:**
- Se agoto la quota del free tier de Gemini (20 req/dia para 2.5-flash) durante pruebas intensivas — el evaluate hacia 2 llamadas en paralelo; resuelto con el prompt combinado
- Error de clave duplicada en sessions/save al recargar la pagina de feedback — resuelto con upsert
- La instruccion "empeaza desde los fundamentos si le fue mal" en el prompt del tutor causaba que el tutor cuestionara respuestas correctas — revertida

**Decisiones de diseno:**
- El resumen del profesor se genera junto con el feedback del alumno (misma llamada, mismo momento) y se guarda en Supabase; el dashboard lo lee directo sin llamar a Gemini
- El endpoint /api/summary filtra por `pdf_name` para agrupar sesiones de la misma unidad
- El tutor NUNCA recibe datos demograficos del alumno (gender, career, year van solo a Supabase)
- `professor_summary` es TEXT (markdown), no JSONB

### 2026-05-19 (segunda parte) - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Creado `/api/professor/units` - endpoint GET que agrupa sesiones por pdf_name y retorna stats (session_count, careers, years, genders, avg_duration) sin llamar a Gemini
- Modificado `/api/summary` para aceptar filtros opcionales `careers`, `years`, `genders` (comma-separated query params) y retornar `demographics` en la respuesta
- Actualizado `getAggregateSummaryPrompt` en `prompts.ts` para recibir `filterContext` opcional y avisarle a Gemini qué subgrupo se está analizando
- Creado `/profesor/page.tsx` - server component con auth: si `PROFESOR_KEY` está en env, requiere `?key=XXX` en la URL; si no está seteada, permite acceso libre (útil para dev)
- Creado `/profesor/ProfesorDashboard.tsx` - client component con UI de dos vistas:
  - Vista de lista: cards por material con distribución de carreras (azul) y años (amarillo)
  - Vista de análisis: filtros interactivos por carrera/año/género como pills seleccionables, stats rápidas, análisis de Gemini renderizado como markdown

**Lo interesante del dashboard:**
- Los filtros demográficos permiten comparar subgrupos (ej: "solo 2do año" vs "todos")
- Cada pill muestra el count de sesiones en ese grupo
- El análisis de Gemini se contextualiza automáticamente para el subgrupo filtrado
- Se muestra N sesiones analizadas y duración promedio del subgrupo en el resultado

**Variables de entorno nuevas:**
- `PROFESOR_KEY` - clave para proteger el dashboard docente (opcional; si no se setea, el dashboard es accesible sin auth)

## Workflow de desarrollo
- Martina trabaja en la branch `Martina`, no tiene acceso directo al proyecto de Vercel de Guada
- Para ver cambios en producción: commit → push → PR → merge a main → Vercel hace el deploy automático
- Las pruebas locales se hacen con `npm run dev` en localhost
- `.env.local` tiene las variables de entorno para desarrollo local (incluyendo `PROFESOR_KEY=socratesguada`)
- Cuando se pase a producción, Guada tiene que agregar `PROFESOR_KEY` en las variables de entorno de Vercel

## Instrucciones para Claude
Cuando trabajes en este proyecto:
1. Actualiza este archivo al final de cada sesion con lo que se hizo
2. Mueve items de "Pendientes" a completado cuando se terminen
3. Agrega nuevos pendientes que surjan de la conversacion
4. Registra problemas y soluciones para no repetir errores
5. Si cambias algo del stack o arquitectura, actualiza las secciones correspondientes
