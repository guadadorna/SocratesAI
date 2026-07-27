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
- `src/app/profesor/page.tsx` - Dashboard docente (auth por Supabase magic link)
- `src/app/profesor/login/page.tsx` - Pagina de login docente (magic link form)
- `src/app/profesor/login/actions.ts` - Server action para enviar el magic link
- `src/app/auth/callback/route.ts` - Callback OAuth/OTP de Supabase; redirige a /profesor tras login exitoso
- `src/lib/supabase-server.ts` - Cliente Supabase SSR (con cookies, para Server Components y Route Handlers)
- `src/proxy.ts` - Middleware de Next.js 16 (refresca sesion Supabase en cada request a /profesor/* y /auth/*)
- `src/app/profesor/ProfesorDashboard.tsx` - UI del dashboard docente (client component, incluye feedback del profesor y chat de repreguntas)
- `src/app/api/chat/route.ts` - API del chat (streaming con Gemini)
- `src/app/api/evaluate/route.ts` - API de evaluacion/feedback final
- `src/app/api/upload/route.ts` - API para subir PDFs
- `src/app/api/sessions/save/route.ts` - API para guardar sesion en Supabase
- `src/app/api/summary/route.ts` - Resumen agregado de sesiones por unidad (con filtros demograficos)
- `src/app/api/professor/units/route.ts` - Lista de materiales con stats por unidad (flujo legacy, agrupa por pdf_name)
- `src/app/api/professor/chat/route.ts` - Chat de repreguntas del dashboard docente (streaming con Gemini)
- `src/app/api/feedback/route.ts` - Guarda feedback del alumno (en sessions) y del profesor (en unit_feedback)
- `src/app/api/professor/subjects/route.ts` - Lista/crea materias del profesor logueado
- `src/app/api/professor/subjects/[id]/materials/route.ts` - GET lista / POST agrega un PDF a una materia existente
- `src/app/api/professor/subjects/[id]/materials/[materialId]/route.ts` - DELETE elimina un PDF de una materia
- `src/app/api/professor/subjects/[id]/summary/route.ts` - Analisis Gemini + demographics scoped por subject_id (paralelo a /api/summary pero por materia, no por pdf_name)
- `src/app/api/subjects/[id]/route.ts` - GET publico (sin auth) que consume el alumno en /s/[subject_id]; concatena el texto de todos los materiales de la materia
- `src/app/api/subjects/[id]/enroll/route.ts` - Registra un alumno anonimo (uuid en localStorage) como inscripto en una materia
- `src/app/profesor/materias/[id]/page.tsx` - Pagina de detalle de una materia (server component, auth + ownership check)
- `src/app/profesor/materias/[id]/MateriaDetail.tsx` - UI del detalle: material, alumnos inscriptos, upload/reemplazo de PDF, analisis por materia
- `src/components/professor/` - Componentes compartidos entre ProfesorDashboard y MateriaDetail: PillToggle, StatCard, StarRating, ProfesorChat, types
- `src/lib/prompts.ts` - Prompts del tutor y evaluador
- `src/lib/session-store.ts` - Almacenamiento de sesiones (localStorage) + getOrCreateAnonId (id anonimo persistente para enrollments)
- `src/lib/supabase.ts` - Cliente de Supabase
- `src/lib/supabase-server.ts` - Cliente Supabase SSR (con cookies, para Server Components y Route Handlers)
- `src/lib/sanitize.ts` - Sanitizacion de PII con Gemini antes de guardar
- `src/lib/pdf.ts` - parsePdf() compartido (pdf2json) entre upload, creacion de materia y reemplazo de material
- `src/lib/gemini-analysis.ts` - TUTOR_MODELS/ANALYSIS_MODELS/TEMPERATURES/generateWithFallback/buildFilterKey; fuente unica de verdad de que modelo y temperature usa cada llamada a Gemini (tutor vs evaluacion/analisis), compartida por /api/chat, /api/evaluate, /api/professor/chat, /api/summary y /api/professor/subjects/[id]/summary
- `src/lib/subjects.ts` - getOwnedSubject(): trae una materia y valida que pertenezca al profesor logueado
- `src/components/ChatWindow.tsx` - Componente del chat
- `src/components/Timer.tsx` - Timer de la sesion
- `docs/llm-pipeline.md` - Auditoria en criollo de que le pedimos a Gemini en cada paso (tutor, evaluacion individual, analisis agregado), que parametros usa, formato de salida esperado y puntos fragiles conocidos (parseo por delimitador sin validacion, sin temperature seteada, etc)
- `scripts/eval-harness/` - Herramienta local (no es parte de la app, no toca Supabase) para simular sesiones sinteticas (alumno bueno/confundido/que no leyo) contra el tutor real y medir volatilidad del feedback entre corridas. Tambien soporta reproducir sesiones reales jugadas a mano (`--replay-transcript`). Ver `scripts/eval-harness/README.md`

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
10. **Dashboard docente** - Pagina /profesor con auth por magic link (Supabase Auth); muestra materiales con stats demograficos, filtros interactivos por carrera/año/genero, analisis de Gemini contextualizado al subgrupo, exportacion a PDF, y chat de repreguntas
11. **Feedback del tutor** - Al terminar la sesion el alumno puede dejar estrellas + texto libre; el profesor puede hacer lo mismo desde el dashboard. Se guarda en Supabase (sessions.student_feedback y tabla unit_feedback). Pendiente: incorporarlo al accionar del agente
12. **Normalizacion de nombres de PDF** - Los PDFs descargados del campus tienen sufijos de hash MD5 (ej: "7. Dif in Dif_d19b4f2c..._f69d728c....pdf"). La funcion normalizePdfName() los stripea al guardar y al agrupar sesiones, para que no queden separadas como materiales distintos.
13. **Recomendaciones primero en dashboard docente** - El analisis del profesor muestra el action call (recomendaciones para la proxima clase) en un box ambar destacado al tope. Un boton "Ver analisis completo" expande el detalle completo.
14. **Cache de analisis del dashboard docente** - El analisis generado por Gemini se guarda en la tabla `unit_analysis` (pdf_name + filter_key). Al seleccionar una unidad, el analisis se carga automaticamente: si ya existe en cache, aparece instantaneamente; si no, llama a Gemini (~30 seg) y lo guarda. El boton "Regenerar" fuerza una nueva llamada a Gemini y sobreescribe el cache.
15. **Login docente con magic link** - La profesora entra a /profesor/login, ingresa su email y recibe un link de acceso sin contrasena (Supabase Auth OTP). El dashboard muestra el email logueado y boton de cerrar sesion. Reemplaza el sistema anterior de PROFESOR_KEY en URL.
16. **Sistema de materias** - La profesora crea materias desde el dashboard (nombre + PDF). Cada materia genera un link unico `/s/[id]` para compartir con alumnos. El alumno que entra por ese link tiene el PDF pre-cargado y solo elige el tiempo. Las sesiones quedan taggeadas con professor_id y subject_id.
17. **UX sesion mejorada** - Timer fijo en header sticky (siempre visible al scrollear). Boton "Terminar sesion" bajado a la barra inferior (siempre accesible sin scrollear).
18. **Enrolamiento anonimo por QR/link** - El profesor genera un QR por materia desde "Mis materias". Cada alumno que entra por el link/QR queda registrado con un id anonimo (uuid en localStorage) en la tabla `enrollments`. El dashboard muestra la cantidad de alumnos inscriptos por materia.
19. **Pagina de detalle de materia** (`/profesor/materias/[id]`) - Al abrir una materia se ve: lista de PDFs cargados (agregar nuevos o eliminar cualquiera en cualquier momento, no solo al crear), cantidad de alumnos inscriptos, y el analisis de feedback de Gemini **scoped por subject_id** (no por nombre de PDF). Esto resuelve el bug donde una materia que reutiliza el nombre de un PDF suelto viejo (flujo legacy) mezclaba sus sesiones con las de ese PDF en la vista de "Analisis por unidad". Mismos filtros demograficos, cache y chat de repreguntas que la vista legacy, pero aislados por materia.
20. **Multiples PDFs por materia** - Una materia puede tener varios documentos (tabla `materials`, uno-a-muchos con `subjects`). El alumno sigue entrando por un unico link/QR sin elegir nada: el tutor recibe el texto concatenado de todos los PDFs de la materia. Pendiente para una fase futura (pausado, no decidido): agrupar los PDFs en "unidades" y dejar que el alumno elija cual estudiar, al estilo Moodle.
21. **Compartir link/QR desde la pagina de materia** - Los botones "QR" y "Copiar link" no estan solo en la fila de "Mis materias": tambien aparecen en `/profesor/materias/[id]`, arriba del todo, junto al nombre de la materia.

## Anonimizacion (CRITICO)
- Nunca se guarda nombre, email, legajo ni ningun dato personal
- Los datos demograficos (genero, carrera, anio) son categoriales, no identificatorios
- Antes de guardar en Supabase, la conversacion pasa por Gemini flash-lite que reemplaza PII con [DATO_PERSONAL]
- El ID de sesion es un UUID sin relacion con ningun usuario real

## Seguridad de Supabase
- RLS esta **deshabilitada** en `sessions`, `unit_feedback` y `unit_analysis` (lo hace explicitamente el SQL del setup)
- Implicancia: cualquiera con la anon key (que vive en el bundle del cliente y es visible en el browser) puede leer/escribir todas las filas de esas tablas
- Tradeoff aceptado porque las conversaciones ya estan anonimizadas y los datos demograficos son categoriales — no hay PII expuesta
- Al crear el proyecto en Supabase se dejaron marcados "Enable Data API" y "Automatically expose new tables", y desmarcado "Enable automatic RLS" (consistente con el SQL que desactiva RLS)
- Se usa la **anon legacy key** (formato JWT, empieza con `eyJ...`), no las nuevas publishable keys
- **Service role key** (Settings -> API Keys -> Legacy) nunca se usa en esta app; no agregarla a Vercel ni al codigo
- Pendiente futuro: si se agrega auth real de usuarios, re-habilitar RLS y escribir policies (alumno solo ve su sesion; dashboard docente lee todo con un rol distinto)

## Variables de Entorno
- `GOOGLE_GENERATIVE_AI_API_KEY` - API key de Google AI Studio
- `SUPABASE_URL` - URL del proyecto Supabase (desde el 21/7 apunta al proyecto Supabase de **Martu**, no al original de Guada; Guada fue invitada como colaboradora ahi)
- `SUPABASE_ANON_KEY` - Clave publica de Supabase (legacy JWT, empieza con `eyJ...`)
- `NEXT_PUBLIC_SITE_URL` - URL base del sitio; usada para construir el callback del magic link. **Importante**: si esta variable esta seteada para el ambiente Preview (no solo Production) en Vercel, fuerza que el magic link de CUALQUIER deployment (incluidas las previews de otras branches) redirija siempre a esa URL fija, ignorando el fallback automatico a `VERCEL_URL`. Si se prueba login en una preview y el callback da 404, revisar esto primero.
- **Redirect URLs en Supabase Auth** (Authentication → URL Configuration): tienen que incluir explicitamente cada dominio desde el que se va a loguear (localhost, produccion, y la URL de cada preview de branch que se use para probar) o `signInWithOtp` rechaza el pedido sin loguear nada en Auth Logs.
- Despues de cambiar cualquier env var en Vercel hace falta **Redeploy manual** — no se aplica sola al deployment ya corriendo. Production y cada Preview son deployments independientes: redeployar uno no redeploya el otro.

## URLs
- **Produccion**: https://socratesai-two.vercel.app
- **Dashboard docente**: https://socratesai-two.vercel.app/profesor (requiere login con magic link)
- **Login docente**: https://socratesai-two.vercel.app/profesor/login
- **Repo**: https://github.com/guadadorna/SocratesAI

## Limitaciones Conocidas
- Gemini 2.5 Flash a veces tiene alta demanda (hay fallback a 2.5-flash-lite)
- El parsing de PDF puede fallar con PDFs complejos o escaneados
- El formulario de intake tiene estilo basico, pendiente pulir
- No hay multi-profesor: el dashboard muestra todas las sesiones sin filtrar por docente (N=1 por ahora)

## Workflow de desarrollo
- Martina trabaja en la branch `Martina`, no tiene acceso directo al proyecto de Vercel de Guada
- Para ver cambios en produccion: commit → push → PR → merge a main → Vercel hace el deploy automatico
- **Preview URL**: Vercel genera automaticamente una URL de preview para la branch `Martina` en el proyecto de Guada con cada push. Guada le paso la URL a Martina, asi que Martina puede ver sus cambios en cada push sin esperar el merge a main.
- Las pruebas locales se hacen con `npm run dev` en localhost
- `.env.local` tiene las variables de entorno para desarrollo local (`GOOGLE_GENERATIVE_AI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`)

### Flujo correcto de PRs (IMPORTANTE)
Guada usa **squash-merge** al mergear PRs. Los commits originales de la branch no aparecen en main (se crea un commit nuevo), lo que genera conflictos enormes si se sigue trabajando en la misma branch sin resetearla.

**Despues de cada merge de Guada a main:**
```
git fetch origin
git reset --hard origin/main
git push origin Martina --force
```
Los tres comandos son necesarios: los primeros dos sincronizan la branch local, el tercero sincroniza la remota. Sin el tercero, la proxima vez que hagas push va a rechazarlo por divergencia.

**Nunca hacer** `git pull` a secas (trae `origin/Martina`, no main).

---

## Pendientes / Ideas Futuras
- [ ] Pulir estilos del formulario de intake
- [ ] Historial de sesiones por estudiante
- [ ] Mejorar parsing de PDFs escaneados (OCR)
- [ ] Incorporar feedback del alumno y del profesor al accionar del agente tutor
- [ ] Agregar professor_id al cache de unit_analysis del flujo LEGACY (pdf_name+filter_key); el cache scoped por materia ya no tiene este problema porque usa subject_id
- [ ] Que Guada mergee el PR de `Martina` a `main` (login docente + sistema de materias) — es lo unico que falta para que funcione en produccion real, no solo en preview
- [ ] Una vez mergeado: probar el flujo completo del alumno via /s/[subject_id] y el login docente en produccion (`socratesai-two.vercel.app`)
- [ ] Sacar el `console.error` de diagnostico agregado en `src/app/profesor/login/actions.ts` una vez confirmado que el login anda estable en produccion
- [ ] Extender `unit_feedback` (o el endpoint `/api/feedback`) para poder asociar el feedback del profesor a un `subject_id` directamente, en vez de solo al nombre de la materia via `pdfName`
- [ ] Definir si en el futuro hace falta agrupar los PDFs de una materia en "unidades" (estilo Moodle) y dejar que el alumno elija cual estudiar — pausado por ahora, hoy el tutor recibe el texto de todos los PDFs concatenado
- [ ] Retomar (con otro enfoque) la idea de que Gemini sugiera cuanto debería durar la sesion: se probo e implemento el 2026-07-22 con un numero fijo de minutos "ideal" segun el material, pero se revirtio antes de commitear porque no tiene en cuenta el tiempo real disponible del alumno y podia sugerir tiempos poco realistas. Ver detalle en el registro de esa sesion antes de reintentarlo
- [ ] A partir de ahora el foco pasa a testear y robustecer lo que ya existe (login docente, sistema de materias, QR/enrollment, pagina de materia, multi-PDF, dashboard docente) en vez de sumar features nuevas, salvo pedido explicito
- [ ] Correr `scripts/eval-harness/` con volumen real (varias personas x varias sesiones, comparando `--temperature 1` contra el default nuevo) + un par de sesiones manuales reales via `--replay-transcript` jugadas en la preview de Vercel (no local, por los problemas conocidos corriendo el host), para confirmar que bajo la volatilidad medida — ya con facturacion habilitada, tener en cuenta que cada corrida consume esa cuenta (gemini-2.5-pro es mas caro por token que flash)
- [ ] Probar Gemini 3 (`gemini-3-flash-preview`, `gemini-3-pro-preview` — ya soportado por `@ai-sdk/google@3.0.63` instalado, sin actualizar nada) con el harness (`--models`) antes de promoverlo a produccion; se pospuso por ser todos modelos `-preview`
- [ ] Seguir con los puntos fragiles que quedan documentados en `docs/llm-pipeline.md`: parseo por delimitador sin validacion/reintento (`===RESUMEN_PROFESOR===`, `===RECOMENDACIONES===`), el tutor sin verificacion en runtime de "nunca validar una respuesta incorrecta", `studentFeedback` sin persistir, y la consistencia de la primera pregunta del tutor entre alumnos (bajar la temperatura ayuda parcial, no la fija — la opcion mas robusta implicaria cachear la apertura por materia, requeriria persistencia nueva, a confirmar)

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

### 2026-05-25 - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Implementada normalizacion de nombres de PDF con sufijos de campus: nueva funcion `normalizePdfName()` en `src/lib/sanitize.ts`, aplicada en `sessions/save/route.ts` (al guardar), `professor/units/route.ts` (al agrupar) y `summary/route.ts` (al consultar con `.or()`)
- Implementado "recomendaciones primero" en dashboard docente: el prompt de `getAggregateSummaryPrompt` en `src/lib/prompts.ts` ahora incluye delimitador `===RECOMENDACIONES===`; `summary/route.ts` lo parsea y devuelve `recommendations` separado; `ProfesorDashboard.tsx` muestra las recomendaciones en un box ambar al tope con boton "Ver analisis completo" para expandir el detalle

**Problemas encontrados:**
- El regex inicial para normalizar PDF (`\s+[a-zA-Z0-9]{4,}\.pdf$`) era incorrecto: el campus usa guiones bajos y hashes MD5 de 32 chars (`_d19b4f2c630efc14e314c67a4af05c76_f69d728c1c5ad026c9e479f609adf56d.pdf`), no espacios ni cadenas cortas. Corregido con `(_[0-9a-f]{16,})+\.pdf$/i`

**Decisiones de diseno:**
- En `summary/route.ts` el filtro de Supabase usa `.or()` combinando igualdad exacta (nombre normalizado) e ILIKE (patron con sufijo de campus), para capturar sesiones historicas guardadas con nombre sin normalizar
- Las recomendaciones se extraen del texto completo pero `summary` conserva el texto completo limpio (sin el delimitador); el frontend muestra ambos sin duplicar llamadas a Gemini

### 2026-05-28 - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Extendida `normalizePdfName()` en `src/lib/sanitize.ts` para cubrir dos patrones adicionales que el regex anterior no manejaba:
  - `_hash 2.pdf` — Windows agrega un contador numerico cuando se descarga el mismo archivo dos veces (`_d19b4f2c... 2.pdf`)
  - ` (1).pdf` — sufijo de duplicado que agrega el sistema operativo (`resumen (1).pdf`)
- Regex actualizado de `(_[0-9a-f]{16,})+\.pdf$/i` a `(?:(_[0-9a-f]{16,})+(?: \d+)?| \(\d+\))\.pdf$/i`

**Problemas encontrados:**
- Ninguno

### 2026-06-05 - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Implementado cache de analisis del dashboard docente en nueva tabla Supabase `unit_analysis`
- Modificado `src/app/api/summary/route.ts`: agrega `buildFilterKey()` para construir clave de cache (ej: `"all"` o `"careers:ISI|years:1,2"`); al inicio del handler busca en `unit_analysis` por `(pdf_name, filter_key)` y devuelve el cache si existe; despues de llamar a Gemini hace upsert en `unit_analysis`; parametro `?regenerate=true` fuerza nueva llamada
- Modificado `src/app/profesor/ProfesorDashboard.tsx`: eliminado boton "Generar analisis"; agregado `useEffect` que auto-dispara el analisis al seleccionar unidad; boton "Regenerar" pasa `true` al handler para forzar `?regenerate=true`

**Problemas encontrados:**
- La respuesta del cache devolveria `session_count` (columna Supabase) en vez de `sessionCount` (lo que espera el frontend) — corregido mapeando el campo al devolver el cache

**Decisiones de diseno:**
- El cache es por `(pdf_name, filter_key)`: `filter_key` es un string determinístico de los filtros activos, `"all"` cuando no hay filtros. UNIQUE constraint permite upsert limpio.
- El analisis cacheado persiste entre sesiones del browser (en Supabase, no en localStorage)
- Al cambiar filtros, el usuario usa "Regenerar" para generar el analisis filtrado; no hay auto-regeneracion en cada toggle de pill (evita llamadas excesivas a Gemini)

**Cambios en Supabase requeridos:**
```sql
CREATE TABLE IF NOT EXISTS unit_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdf_name TEXT NOT NULL,
  filter_key TEXT NOT NULL DEFAULT 'all',
  summary TEXT NOT NULL,
  recommendations TEXT,
  session_count INTEGER,
  demographics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pdf_name, filter_key)
);
ALTER TABLE unit_analysis DISABLE ROW LEVEL SECURITY;
```

### 2026-06-05 (segunda parte) - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Fix del bug "tutor se frena": el tutor decia "claro!" y no continuaba; el alumno tenia que mandar otro mensaje para que siguiera
- Modificado `src/lib/prompts.ts` — tres cambios quirurgicos en `getTutorPrompt`:
  1. **EXTENSION DE LAS RESPUESTAS**: extendido limite a 5-6 oraciones cuando incluye explicacion; agregada regla explicita de que todo turno debe terminar con pregunta (salvo cierre), y que la pregunta final no cuenta para el limite
  2. **Si el estudiante responde bien**: ultimo bullet cambiado de "despues profundiza" (ambiguo) a "despues hace la siguiente pregunta... ese turno no puede terminar sin preguntar" (explicito)
  3. **Desarrollo**: corregido "3-4 preguntas" a "2-3 preguntas; la regla de avance tiene prioridad" para consistencia con REGLA DE AVANCE

**Causa del bug:**
- La instruccion de explicar en 2-3 oraciones competia con el limite de 2-4 oraciones por turno
- El modelo usaba todo el presupuesto en la explicacion y no le quedaba lugar para la pregunta siguiente
- Solucion: extender el limite + regla explicita de que la pregunta no cuenta para el limite

**Decisiones de diseno:**
- Se mantuvo la instruccion de explicar (Guada y Martina no querian sacarla)
- La excepcion "salvo durante la fase de cierre" preserva el comportamiento de recap al final de sesion
- No se toco ninguna instruccion sobre como o cuando explica el tutor

### 2026-06-19 - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Implementado login docente con magic link via Supabase Auth
- Reemplazado PROFESOR_KEY por `supabase.auth.getUser()` en `/profesor/page.tsx`
- Agregado boton "Cerrar sesion" en header del dashboard (server action)
- Header del dashboard muestra email del profesor logueado
- Modificado `src/app/auth/callback/route.ts`: redirige a `/profesor` tras login
- Eliminado codigo de API-key-por-profesor: `cuenta/`, `api/professor/api-key/`, `crypto.ts`
- "Soy docente" en landing redirige a `/profesor/login` (en vez de pedir contrasena)
- Implementado sistema de materias: `subjects` table, `/api/professor/subjects`, `/api/subjects/[id]`
- Nueva pagina `/s/[subject_id]`: entrada de alumnos via link del profesor (PDF pre-cargado)
- Sessions taggeadas con `professor_id` y `subject_id` al guardar
- Dashboard filtra sesiones por profesor logueado (OR null para sesiones historicas)
- Timer con `sticky top-0` en header: siempre visible al scrollear
- Boton "Terminar sesion" bajado a barra inferior: siempre accesible

**Decisiones de diseno:**
- API key del sistema para todos (no por profesor), alineado con decision de reunion
- Sesiones historicas (professor_id = null) siguen visibles para cualquier profe logueada (compat hacia atras)
- El cache de `unit_analysis` no incluye professor_id todavia (aceptable para N=1)

**Pasos pendientes para produccion (Guada):**
- Actualizar en Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (al proyecto con Auth habilitado), `NEXT_PUBLIC_SITE_URL=https://socratesai-two.vercel.app`
- Eliminar `PROFESOR_KEY` de Vercel (ya no se usa)
- Correr SQL de nuevas tablas/columnas si no se hizo: subjects table + ALTER TABLE sessions ADD COLUMN professor_id/subject_id
- Habilitar Email Auth en Supabase + agregar redirect URLs de produccion

---

### 2026-07-21 - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Diagnosticado y resuelto el login docente con magic link, roto desde el 19/6: la causa real era `NEXT_PUBLIC_SITE_URL` fija a la URL de produccion, que forzaba el redirect del magic link ahi en cualquier ambiente (incluida la preview), combinado con Redirect URLs faltantes en Supabase Auth (localhost, produccion y la URL de preview de la branch Martina)
- Agregado `console.error('[signInWithMagicLink]', error)` en `src/app/profesor/login/actions.ts` para loguear el error real de `signInWithOtp` del lado del servidor (commit `f200c6c`)
- Migrado el proyecto para usar el Supabase de Martu (con Auth ya configurado) en vez de crear una cuenta institucional nueva; se invito a Guada como colaboradora ahi (rol Developer)
- Armado instructivo para agregar a Martu como colaboradora del proyecto de Vercel de Guada (rol Member, no Developer — Developer no puede editar env vars de produccion). Pendiente de que Guada lo ejecute (requiere plan pago de Vercel para agregar miembros)
- **Hallazgo clave**: la branch `Martina` (con todo el login docente + sistema de materias) nunca habia sido mergeada a `main` via Pull Request — por eso el callback del magic link daba 404 en produccion real, mas alla de cualquier configuracion de env vars. Confirmado comparando `git log origin/main..origin/Martina`
- Abierto Pull Request de `Martina` a `main` para llevar la feature a produccion; enviado a Guada para review y merge

**Problemas encontrados:**
- El login habia funcionado una vez el 19/6 en preview (antes de que existiera `NEXT_PUBLIC_SITE_URL`, el codigo caia al fallback `VERCEL_URL` que apuntaba correctamente a la preview) y se rompio despues de agregar esa variable apuntando fijo a produccion
- Cambiar env vars en Vercel no alcanza: hace falta Redeploy manual, y por separado para produccion y para cada preview (son deployments independientes)
- Navegar los logs de Supabase (Auth Logs vs Postgres Logs vs Edge/API Logs) resulto confuso en la practica; varios intentos terminaron mirando logs de Postgres (ruido de checkpoints) en vez de Auth Logs

**Decisiones de diseno:**
- No exponer errores tecnicos de Supabase al usuario final en la UI de login (se descarto un intento de mostrar `error.message` directamente por mala UX); el diagnostico se resolvio con logging server-side en vez de mensajes visibles

**Pasos pendientes para produccion:**
- Que Guada mergee el Pull Request de `Martina` a `main`
- Confirmar que las tablas/columnas de Supabase (`subjects`, `sessions.professor_id`, `sessions.subject_id`) existan en el Supabase de Martu
- Probar el flujo completo (login docente + `/s/[subject_id]`) en produccion una vez mergeado

### 2026-07-22 - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Diagnosticado el 404 del magic link en preview: `NEXT_PUBLIC_SITE_URL` fijo a produccion + `main` sin el callback (branch `Martina` sin mergear) redirigia siempre a una ruta inexistente en produccion. Resuelto para poder probar sin depender de Guada editando manualmente el `redirect_to` del link crudo del mail hacia la URL de preview (ya estaba en la whitelist de Supabase Auth)
- Probado el flujo completo de enrolamiento por QR/link (feature del commit anterior, `7dfcb66`): confirmado en Supabase que `enrollments`, `subjects` y `sessions` (con `subject_id`/`professor_id`) se completan correctamente
- Diagnosticado por que la sesion de prueba no aparecia bien en el dashboard docente: no era `professor_summary` nulo, sino que la vista de "Analisis por unidad" agrupa por `pdf_name` normalizado e ignora `subject_id` — al reusar una materia el nombre de un PDF suelto viejo, sus sesiones quedaban mezcladas con las de ese PDF
- Implementada pagina de detalle de materia `/profesor/materias/[id]` con analisis **scoped por subject_id** (no por pdf_name), material del listado "Mis materias" ahora es clickeable
- Agregado endpoint `GET /api/professor/subjects/[id]/summary`, fork de `/api/summary` pero filtrando `sessions` por `subject_id` en vez de `pdf_name`; mismos filtros demograficos, misma logica de cache
- Extraido `parsePdf()` duplicado (upload viejo + creacion de materia) a `src/lib/pdf.ts`; extraidos `MODELS`/`generateWithFallback`/`buildFilterKey` de `/api/summary` a `src/lib/gemini-analysis.ts`; nuevo `src/lib/subjects.ts` con `getOwnedSubject()` para el ownership check
- Extraidos `PillToggle`, `StatCard`, `StarRating`, `ProfesorChat` de `ProfesorDashboard.tsx` a `src/components/professor/`, compartidos ahora entre el dashboard legacy y la pagina nueva de materia
- Movidas las sesiones sueltas sin materia (datos de prueba del flujo legacy) a una seccion colapsable "Ejemplos / Tutorial" al pie del dashboard, para que no queden mezcladas visualmente con las materias reales

**Segunda parte de la sesion — multiples PDFs por materia:**
- Detectado que el modelo de 1 PDF por materia era muy limitado (Martina probando el detalle de materia notó que no se podían tener varios documentos, y que "reemplazar" perdía el anterior)
- Nueva tabla `materials` (subject_id, pdf_name, pdf_content, created_at): una materia ahora puede tener N PDFs. Se migra el PDF que ya tenía cada materia como su primer registro
- Reemplazado el endpoint `PUT /api/professor/subjects/[id]` (que reemplazaba el unico PDF) por `GET/POST /api/professor/subjects/[id]/materials` (listar/agregar) y `DELETE /api/professor/subjects/[id]/materials/[materialId]` (eliminar uno)
- `src/app/api/professor/subjects/route.ts`: la creacion de materia ahora inserta el PDF (si se sube) como el primer registro de `materials`, no en columnas de `subjects`. El listado devuelve `material_count` en vez de `pdf_name`
- `src/app/api/subjects/[id]/route.ts` (publico, consumido por `/s/[subject_id]`): en vez de leer `subjects.pdf_content`, concatena el texto de **todos** los materiales de la materia (separados por encabezado `### nombre.pdf`) — el alumno sigue entrando por el mismo link sin elegir nada, el tutor simplemente tiene mas contenido para preguntar
- `MateriaDetail.tsx`: el dropzone de "reemplazar PDF" paso a ser una lista de materiales con boton "Eliminar" por item + dropzone de "Agregar PDF" al pie
- `src/lib/subjects.ts` (`getOwnedSubject`) y las columnas `subjects.pdf_name`/`pdf_content` quedan sin usarse desde el codigo (no se dropearon de la tabla, solo se dejo de leer/escribir ahi) — la fuente de verdad del material es la tabla `materials`

**Tercera parte de la sesion — compartir link/QR desde la pagina de materia:**
- Los botones "QR" y "Copiar link" (antes solo en la fila de "Mis materias") ahora tambien aparecen arriba en `/profesor/materias/[id]`
- Extraida la logica (copiar al portapapeles + modal de QR con `qrcode`) a un componente compartido `src/components/professor/ShareSubjectButtons.tsx`, usado desde `MisMaterias` (en `ProfesorDashboard.tsx`) y desde `MateriaDetail.tsx`, para no duplicar el modal de QR una segunda vez

**Intentado y revertido — sugerencia de tiempo con Gemini:**
- Se implemento (prompt + endpoint + UI en `/dashboard`, `/s/[subject_id]` y la pagina de materia) que Gemini analice el material y sugiera cuantos minutos debería durar la sesion, para que no queden cortas
- Martina pidio revertirlo antes de commitear: se dio cuenta de que la sugerencia de Gemini iba a tirar tiempos poco realistas (ej. "25 minutos que nadie tiene") y no iba a ser util tal cual estaba planteado — el diseño (un numero fijo de minutos "ideales" segun la cantidad de conceptos del material, sin tener en cuenta cuanto tiempo tiene realmente disponible el alumno) no resuelve el problema real
- Revertido con `git checkout` antes de cualquier commit; no quedo rastro en el codigo ni en Supabase (no se llego a correr la migracion de `subjects.suggested_minutes`)
- Si se retoma en el futuro, repensar el enfoque: quizas mostrar un rango en vez de un numero fijo, o dejar que el alumno diga cuanto tiempo tiene y que el tutor ajuste la profundidad (algo que el prompt del tutor ya hace parcialmente, ver `conceptosSegunTiempo` en `getTutorPrompt`), en vez de que Gemini imponga un tiempo "ideal" que no es realista

**Problemas encontrados:**
- `npx next build` local falla en el prerender de `/_global-error` / `/_not-found` con `Invariant: Expected workStore to be initialized` — confirmado con `git stash` que este error **ya existia antes de esta sesion** (pasa igual con el codigo original de `main`/`Martina` sin tocar). No relacionado a los cambios de hoy; no se investigo mas a fondo porque no bloquea el trabajo (Vercel builda distinto) y la maquina local de Martina no soporta bien correr `npm run dev` para diagnosticar a fondo. Pendiente revisar si molesta en el futuro.

**Decisiones de diseno:**
- Se decidio NO tocar `/api/professor/units` ni la logica de negocio de `/api/summary` (vista legacy por pdf_name): quedan intactas para las sesiones sueltas sin materia; el analisis por materia vive en un endpoint y cache separados
- Cache de analisis por materia: se agrego columna `subject_id` (nullable) a `unit_analysis` + un indice unico nuevo `UNIQUE(subject_id, filter_key)` que convive con el `UNIQUE(pdf_name, filter_key)` existente (en Postgres, multiples NULLs no colisionan bajo un indice unico, asi que las filas legacy no se ven afectadas)
- Pagina de detalle de materia es una pagina propia (`/profesor/materias/[id]`), no un modal, para dejar lugar a crecer (ej. lista de sesiones de esa materia) sin apilar mas modales sobre el dashboard
- Multiples PDFs por materia: se permite borrar un material ya subido (a diferencia de MVPs anteriores que evitaban destructivo); el contenido que ve el tutor es la concatenacion de todos los PDFs de la materia, sin que el alumno elija nada — la eleccion de "que PDF estudiar" (tipo unidades de Moodle) se dejo pausada para una fase futura si hace falta
- El label que se le pasa a Gemini/feedback/chat para identificar la materia paso a ser siempre `subject.name` (antes era `pdf_name` con fallback al nombre) — tiene mas sentido ahora que una materia puede tener varios PDFs con nombres distintos

**Cambios en Supabase requeridos:**
```sql
-- Corrido por Martina el 2026-07-22
ALTER TABLE unit_analysis ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id);
CREATE UNIQUE INDEX IF NOT EXISTS unit_analysis_subject_id_filter_key_idx
  ON unit_analysis (subject_id, filter_key);

-- Corrido por Martina el 2026-07-22 (tabla materials, multiples PDFs por materia)
CREATE TABLE IF NOT EXISTS materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  pdf_name TEXT NOT NULL,
  pdf_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE materials DISABLE ROW LEVEL SECURITY;

-- Migra el PDF que ya tenia cada materia como su primer material
INSERT INTO materials (subject_id, pdf_name, pdf_content, created_at)
SELECT id, pdf_name, pdf_content, created_at
FROM subjects
WHERE pdf_name IS NOT NULL AND pdf_content IS NOT NULL;
```

### 2026-07-27 - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Diagnosticado el pipeline de feedback actual: ninguna llamada a Gemini (tutor, evaluacion, analisis agregado) tiene `temperature` seteada; el parseo por delimitador de texto (`===RESUMEN_PROFESOR===` en evaluate/route.ts, `===RECOMENDACIONES===` en el analisis agregado) falla en silencio si el modelo no lo incluye; y el `studentFeedback` generado en `/api/evaluate` nunca se persiste en Supabase (solo el `professor_summary`)
- Creado `docs/llm-pipeline.md`: documento de auditoria en criollo de que le pedimos a Gemini en cada paso, con que modelo/parametros, que formato de salida se espera y los puntos fragiles de arriba
- Creado `scripts/eval-harness/`: herramienta local (no es parte de la app, no toca Supabase, todo el output queda en archivos locales gitignoreados bajo `results/`) que reusa literalmente `getTutorPrompt`, `getCombinedEvaluationPrompt` y `generateWithFallback` de produccion para: (1) simular sesiones completas con un "alumno sintetico" (personas `alumno_ejemplar`, `alumno_confundido`, `alumno_no_leyo`, `alumno_mixto`) conversando con el tutor real, y (2) correr el paso de evaluacion N veces sobre el mismo transcript para aislar la volatilidad propia del prompt de evaluacion. Ver `scripts/eval-harness/README.md` para el uso completo
- Agregado modo `--replay-transcript` al harness para correr el mismo pipeline de medicion sobre una sesion real jugada a mano (copiando el JSON de `localStorage['socrates_session']`), y poder comparar la volatilidad sintetica contra la real
- Agregado `tsx` como devDependency (unico requisito nuevo; confirmado que resuelve el alias `@/*` de tsconfig sin configuracion adicional) y el script `npm run eval:harness`
- Corridos varios smoke tests del harness (con material de respaldo y con un PDF real) verificando: transcript con el mismo shape que `SessionData.messages`, fallback de modelo funcionando ante error de cuota, y metricas/`summary.md` generados correctamente

**Problemas encontrados:**
- Ninguno bloqueante. Un hallazgo real (no un bug del harness) durante las pruebas: en una corrida el tutor valido como "excelente" una respuesta del alumno sintetico que en realidad invertia el orden de la resta en Diferencias en Diferencias — viola la regla mas critica del propio prompt del tutor ("nunca validar una respuesta incorrecta"). Tambien se vio que el LLM a veces devuelve las 5 secciones del feedback como prosa corrida, sin ningun heading ni negrita, pese a que el prompt se lo pide explicitamente — esto es justamente el tipo de volatilidad que motivo este trabajo

**Decisiones de diseno:**
- Fase de solo medicion: no se toco ningun prompt de produccion ni se agrego infraestructura nueva en Supabase en esta sesion. El plan (a pedido explicito de Martina) fue primero instrumentar y medir, y recien despues decidir que ajustar
- El harness duplica (con comentarios de "mantener sincronizado") dos piezas de logica que viven dentro de route handlers y no se pueden importar: el parseo de `evaluate/route.ts` y el texto de cierre de `chat/route.ts`
- Las metricas de volatilidad son deliberadamente simples (word count, presencia de secciones por palabra clave, tasa de exito del delimitador, extracto de "a reforzar" lado a lado) — sin scoring tipo LLM-as-judge por ahora, a pedido explicito

### 2026-07-27 (segunda parte) - Sesion con Martina (branch Martina)
**Lo que se hizo:**
- Investigado (con research real, no supuesto): `@ai-sdk/google@3.0.63` (ya instalado) soporta Gemini 3 (`gemini-3-flash-preview`, `gemini-3-pro-preview`, `gemini-3.1-*`) sin necesidad de actualizar ningun paquete; y confirmado que el error de fallback que veiamos (`Quota exceeded ... free_tier_requests, limit: 20`) es especificamente el free tier de Google AI Studio, no una falla real del modelo — habilitar facturacion (accion manual en aistudio.google.com/apikey, no hace falta Vertex AI) deberia resolver de raiz la caida de calidad que Martina notaba en el fallback
- Centralizados los modelos y agregada `temperature` explicita en `src/lib/gemini-analysis.ts`: `TUTOR_MODELS` (gemini-2.5-flash → gemini-2.5-flash-lite, `temperature: 0.4`) para el tutor conversacional, `ANALYSIS_MODELS` (gemini-2.5-pro → gemini-2.5-flash → gemini-2.5-flash-lite, `temperature: 0.2`) para evaluacion individual y analisis agregado — se paga mas por `gemini-2.5-pro` donde es el feedback real que ven alumno y profesora, se mantiene flash (mas barato/rapido) en la conversacion turno a turno
- Eliminadas las 3 copias duplicadas de `MODELS`/`generateWithFallback` que existian en `evaluate/route.ts`, `chat/route.ts` y `professor/chat/route.ts` — ahora los tres importan de `gemini-analysis.ts`
- `generateWithFallback()` ahora acepta `options?: { models?, temperature? }` (default = `ANALYSIS_MODELS`/0.2, asi `/api/summary` y `/api/professor/subjects/[id]/summary` quedan cubiertos sin tocarlos)
- Extendido `scripts/eval-harness/` con overrides `--temperature` y `--models` (en `config.ts`, `session-runner.ts`, `evaluate-runner.ts`, `replay-runner.ts`) para poder A/B testear variantes (incluida una futura prueba de Gemini 3) sin tocar codigo de produccion
- Actualizado `docs/llm-pipeline.md`: punto fragil #1 (sin temperature) y #5 (duplicacion) marcados como resueltos, agregada nota sobre Gemini 3 pospuesto y sobre la consistencia de la apertura del tutor (pendiente)
- Verificado `npx tsc --noEmit` y `npx eslint` limpios en todos los archivos tocados

**Decisiones tomadas con Martina:**
- No incorporar Gemini 3 todavia (son todos `-preview`, riesgo de cambios sin aviso de Google) — probarlo primero con volumen via el harness en una sesion futura
- Separar modelo por tarea: tutor en familia flash, evaluacion/analisis en `gemini-2.5-pro` (Martina confirmo que pagar mas por esto no es problema)
- La consistencia de la primera pregunta del tutor entre alumnos queda pospuesta (prioridad: bajar la volatilidad general primero); la temperatura mas baja ayuda parcialmente pero no la garantiza — la opcion mas robusta (cachear la apertura por materia) implicaria persistencia nueva, no se implemento

**Pendiente inmediato:** que Martina habilite facturacion en Google AI Studio, y despues correr el harness con volumen + un par de sesiones manuales en la preview de Vercel para confirmar que la volatilidad bajo de verdad.

**Actualizacion (mismo dia):** Martina habilito facturacion en Google AI Studio (cargo USD 25). Queda confirmado que las corridas del harness consumen esa misma cuenta de facturacion (llaman a la API real de Gemini, no hay nada gratis/simulado del lado de Google) — tenerlo en cuenta si se corren volumenes grandes de pruebas sinteticas, sobre todo ahora que la evaluacion usa `gemini-2.5-pro` (mas caro por token que flash).

## Instrucciones para Claude
Cuando trabajes en este proyecto:
1. Actualiza este archivo al final de cada sesion con lo que se hizo
2. Elimina items de "Pendientes" cuando se terminen y agrega la funcionalidad a "Funcionalidades Actuales"
3. Agrega nuevos pendientes que surjan de la conversacion
4. Registra problemas y soluciones para no repetir errores
5. Si cambias algo del stack o arquitectura, actualiza las secciones correspondientes
6. Si tocas `src/lib/prompts.ts` o la logica de llamadas a Gemini (fallback de modelos, parseo de delimitadores), actualiza tambien `docs/llm-pipeline.md`
