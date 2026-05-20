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
- **Base de datos**: Supabase (PostgreSQL)
- **Deploy**: Vercel
- **Repo**: https://github.com/guadadorna/SocratesAI

## Estructura de Archivos Clave
- `src/app/page.tsx` - Landing/home
- `src/app/dashboard/page.tsx` - Dashboard del alumno (sube PDF, configura sesion)
- `src/app/intake/[id]/page.tsx` - Formulario demografico anonimo (carrera, año, genero)
- `src/app/session/[id]/page.tsx` - Sesion de chat con el tutor
- `src/app/session/[id]/feedback/page.tsx` - Pagina de feedback post-sesion (incluye formulario de feedback del alumno)
- `src/app/profesor/page.tsx` - Dashboard docente (auth por PROFESOR_KEY)
- `src/app/profesor/ProfesorDashboard.tsx` - UI del dashboard docente (client component, incluye feedback del profesor y chat de repreguntas)
- `src/app/api/chat/route.ts` - API del chat (streaming con Gemini)
- `src/app/api/evaluate/route.ts` - API de evaluacion/feedback final
- `src/app/api/upload/route.ts` - API para subir PDFs
- `src/app/api/sessions/save/route.ts` - API para guardar sesion en Supabase
- `src/app/api/summary/route.ts` - Resumen agregado de sesiones por unidad (con filtros demograficos)
- `src/app/api/professor/units/route.ts` - Lista de materiales con stats por unidad
- `src/app/api/professor/chat/route.ts` - Chat de repreguntas del dashboard docente (streaming con Gemini)
- `src/app/api/feedback/route.ts` - Guarda feedback del alumno (en sessions) y del profesor (en unit_feedback)
- `src/lib/prompts.ts` - Prompts del tutor y evaluador
- `src/lib/session-store.ts` - Almacenamiento de sesiones (localStorage)
- `src/lib/supabase.ts` - Cliente de Supabase
- `src/lib/sanitize.ts` - Sanitizacion de PII con Gemini antes de guardar
- `src/components/ChatWindow.tsx` - Componente del chat
- `src/components/Timer.tsx` - Timer de la sesion

## Flujo de datos
Dashboard → /intake/[id] (datos demograficos) → /session/[id] (chat) → /feedback (guardar en Supabase + mostrar feedback)

## Funcionalidades Actuales
1. **Subir PDF** - El profesor sube material de una unidad
2. **Formulario de intake** - Antes de la sesion, el alumno elige carrera, año y genero (anonimo, sin nombre)
3. **Sesion de tutoria** - Chat con timer, el tutor hace preguntas socraticas
4. **Modo practica** - Sesion sin temporizador, sin presion de tiempo
5. **Fase de cierre** - Cuando quedan <2 min, el tutor cierra la conversacion
6. **Feedback diferenciado** - Al terminar, genera feedback para el alumno (segunda persona) y para la docente (tercera persona), en una sola llamada a Gemini
7. **Exportar feedback como PDF** - El usuario puede descargar el diagnostico en PDF
8. **Persistencia de sesiones** - Al terminar, la conversacion y el resumen del profesor se guardan en Supabase (conversacion anonimizada con Gemini)
9. **Render de LaTeX** - Las ecuaciones en el chat, en el feedback y en el dashboard se renderizan correctamente (KaTeX)
10. **Dashboard docente** - Pagina /profesor con auth por PROFESOR_KEY; muestra materiales con stats demograficos, filtros interactivos por carrera/año/genero, analisis de Gemini contextualizado al subgrupo, exportacion a PDF, y chat de repreguntas
11. **Feedback del tutor** - Al terminar la sesion el alumno puede dejar estrellas + texto libre; el profesor puede hacer lo mismo desde el dashboard. Se guarda en Supabase (sessions.student_feedback y tabla unit_feedback). Pendiente: incorporarlo al accionar del agente

## Anonimizacion (CRITICO)
- Nunca se guarda nombre, email, legajo ni ningun dato personal
- Los datos demograficos (genero, carrera, anio) son categoriales, no identificatorios
- Antes de guardar en Supabase, la conversacion pasa por Gemini flash-lite que reemplaza PII con [DATO_PERSONAL]
- El ID de sesion es un UUID sin relacion con ningun usuario real

## Seguridad de Supabase
- RLS esta **deshabilitada** en `sessions` y `unit_feedback` (lo hace explicitamente el SQL del setup)
- Implicancia: cualquiera con la anon key (que vive en el bundle del cliente y es visible en el browser) puede leer/escribir todas las filas de esas tablas
- Tradeoff aceptado porque las conversaciones ya estan anonimizadas y los datos demograficos son categoriales — no hay PII expuesta
- Al crear el proyecto en Supabase se dejaron marcados "Enable Data API" y "Automatically expose new tables", y desmarcado "Enable automatic RLS" (consistente con el SQL que desactiva RLS)
- Se usa la **anon legacy key** (formato JWT, empieza con `eyJ...`), no las nuevas publishable keys
- **Service role key** (Settings -> API Keys -> Legacy) nunca se usa en esta app; no agregarla a Vercel ni al codigo
- Pendiente futuro: si se agrega auth real de usuarios, re-habilitar RLS y escribir policies (alumno solo ve su sesion; dashboard docente lee todo con un rol distinto)

## Variables de Entorno
- `GOOGLE_GENERATIVE_AI_API_KEY` - API key de Google AI Studio
- `SUPABASE_URL` - URL del proyecto Supabase
- `SUPABASE_ANON_KEY` - Clave publica de Supabase
- `PROFESOR_KEY` - Contrasena para proteger el dashboard docente (opcional; sin ella, el dashboard es publico)

## URLs
- **Produccion**: https://socratesai-two.vercel.app
- **Dashboard docente**: https://socratesai-two.vercel.app/profesor?key=socratesguada
- **Repo**: https://github.com/guadadorna/SocratesAI

## Limitaciones Conocidas
- Gemini 2.5 Flash a veces tiene alta demanda (hay fallback a 2.5-flash-lite)
- El parsing de PDF puede fallar con PDFs complejos o escaneados
- No hay autenticacion de usuarios real (el dashboard docente usa una key simple en URL)
- El formulario de intake tiene estilo basico, pendiente pulir

## Workflow de desarrollo
- Martina trabaja en la branch `Martina`, no tiene acceso directo al proyecto de Vercel de Guada
- Para ver cambios en produccion: commit → push → PR → merge a main → Vercel hace el deploy automatico
- Las pruebas locales se hacen con `npm run dev` en localhost
- `.env.local` tiene las variables de entorno para desarrollo local (incluyendo `PROFESOR_KEY=socratesguada`)
- Cuando se pase a produccion, Guada tiene que agregar `PROFESOR_KEY` en las variables de entorno de Vercel

---

## Pendientes / Ideas Futuras
- [ ] Pulir estilos del formulario de intake
- [ ] Autenticacion de usuarios real (profesor vs estudiante)
- [ ] Historial de sesiones por estudiante
- [ ] Mejorar parsing de PDFs escaneados (OCR)
- [ ] Permitir multiples unidades/materias

---

## Registro de Sesiones

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

### 2026-04-21 - Sesion con Claude
**Lo que se hizo:**
- Fix del error "Error al generar el feedback" en evaluate/route.ts
- Cambiado modelo fallback de gemini-2.0-flash a gemini-2.5-flash-lite (consistente con otras apps)
- Mejorado mensaje de error para mostrar el error real
- Cambiado en prompt de evaluador "Conceptos flojos" por "Conceptos a reforzar"

**Problemas encontrados:**
- El fallback gemini-2.0-flash no era el correcto, causaba fallo en evaluacion

### 2026-05-13 - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Implementado modo "practica" sin temporizador
- Fix de colores en la UI (modo practica vs modo normal)
- Implementado fallback real para streaming con modelos Gemini
- Agregado logging al fallback de evaluate para facilitar debugging
- Implementada exportacion del feedback como PDF
- Agregada duracion real de la sesion en el feedback
- Render de markdown en el feedback (antes se mostraba texto plano con simbolos)

**Problemas encontrados:**
- El fallback de Gemini no estaba implementado correctamente para streaming, causaba errores silenciosos
- El feedback mostraba markdown sin renderizar

**Decisiones de diseno:**
- Modo practica es una opcion al iniciar sesion, no reemplaza el modo con timer
- La duracion real se calcula desde el inicio hasta el fin de la sesion

### 2026-05-16 - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Configurado Supabase con tabla `sessions` (gender, career, year, pdf_name, duration_minutes, mode, messages)
- Creado `src/lib/supabase.ts` y `src/lib/sanitize.ts`
- Creado `src/app/api/sessions/save/route.ts` - endpoint que sanitiza y guarda en Supabase
- Creado `src/app/intake/[id]/page.tsx` - formulario demografico anonimo
- Modificado `dashboard/page.tsx` para redirigir a /intake/[id] antes de la sesion
- Modificado `feedback/page.tsx` para llamar al endpoint de guardado al terminar

**Problemas encontrados:**
- Error de clave duplicada en sessions/save al recargar la pagina de feedback — resuelto con upsert

**Decisiones de diseno:**
- Guardar la conversacion cruda (messages) es mas valioso que el feedback (que se puede regenerar)

### 2026-05-19 - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Agregada columna `professor_summary TEXT` a la tabla `sessions` en Supabase
- Reemplazados dos prompts separados por `getCombinedEvaluationPrompt`: una sola llamada a Gemini genera ambos textos separados por `===RESUMEN_PROFESOR===`
- Modificado `evaluate/route.ts` para usar el prompt combinado y separar el output
- Creado `src/app/api/summary/route.ts` - endpoint GET /api/summary?pdf=nombre.pdf con desglose demografico
- Instalado remark-math, rehype-katex, katex; render de LaTeX en chat y feedback
- Revertida instruccion de contexto adicional en el prompt del tutor (causaba comportamiento condescendiente)
- Creado `/api/professor/units` - endpoint GET que agrupa sesiones por pdf_name con stats
- Modificado `/api/summary` para aceptar filtros opcionales `careers`, `years`, `genders` y retornar `demographics`
- Creado `/profesor/page.tsx` - server component con auth por PROFESOR_KEY
- Creado `/profesor/ProfesorDashboard.tsx` - dashboard interactivo con filtros demograficos como pills, analisis de Gemini contextualizado al subgrupo, render de LaTeX, boton de exportacion a PDF

**Problemas encontrados:**
- Se agoto la quota del free tier de Gemini durante pruebas intensivas — el evaluate hacia 2 llamadas en paralelo; resuelto con el prompt combinado
- La instruccion "empieza desde los fundamentos si le fue mal" causaba que el tutor cuestionara respuestas correctas — revertida

**Decisiones de diseno:**
- El resumen del profesor se genera junto con el feedback del alumno (misma llamada) y se guarda en Supabase; el dashboard lo lee sin llamar a Gemini
- El dashboard docente usa una key simple en URL (?key=socratesguada) como auth; no es auth real pero protege de acceso casual
- Los filtros demograficos del dashboard son optativos: por defecto muestra todas las sesiones

### 2026-05-19 (tercera parte) - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Creado `src/app/api/professor/chat/route.ts` - endpoint POST de streaming para el chat de repreguntas del dashboard docente; usa el mismo patron de fallback que `/api/chat`
- Modificado `ProfesorDashboard.tsx` para agregar componente `ProfesorChat` al final del analisis: fetch manual + streaming, mensajes con ReactMarkdown + KaTeX, animacion de typing
- Creado `src/app/api/feedback/route.ts` - endpoint POST que guarda feedback del alumno en `sessions.student_feedback` (JSONB) y feedback del profesor en tabla `unit_feedback`
- Modificado `feedback/page.tsx` para agregar formulario de feedback del alumno: estrellas 1-5 + textarea condicional, aparece debajo de los botones de accion, fire-and-forget
- Modificado `ProfesorDashboard.tsx` para agregar formulario de feedback del profesor: estrellas + textarea siempre visible, aparece entre el analisis y el chat de repreguntas, guarda el filterContext activo
- Agregado `StarRating` como componente inline en ambos archivos

**Problemas encontrados:**
- `useChat` de `@ai-sdk/react` v3 tiene una API completamente distinta a versiones anteriores (no tiene `input`, `handleInputChange`, `handleSubmit`, `api`); resuelto implementando el streaming con fetch manual igual que el chat del alumno
- Quota de Gemini agotada durante las pruebas (free tier 20 req/dia); el feedback del alumno no se pudo probar en local, pendiente para manana

**Decisiones de diseno:**
- El feedback del profesor siempre muestra el textarea (no condicional al rating), porque el texto libre es clave para que el tutor sepa que temas faltan
- El feedback NO se incorpora al accionar del agente todavia; solo se guarda en Supabase para uso futuro
- La tabla `unit_feedback` es separada de `sessions` porque el feedback del profesor es sobre el analisis agregado de una unidad, no sobre una sesion especifica
- El chat de repreguntas tiene `no-print` para no aparecer al exportar PDF

**Cambios en Supabase requeridos (pendiente correr):**
```sql
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS student_feedback JSONB;
CREATE TABLE IF NOT EXISTS unit_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdf_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  filter_context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Instrucciones para Claude
Cuando trabajes en este proyecto:
1. Actualiza este archivo al final de cada sesion con lo que se hizo
2. Elimina items de "Pendientes" cuando se terminen y agrega la funcionalidad a "Funcionalidades Actuales"
3. Agrega nuevos pendientes que surjan de la conversacion
4. Registra problemas y soluciones para no repetir errores
5. Si cambias algo del stack o arquitectura, actualiza las secciones correspondientes
