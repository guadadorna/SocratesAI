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
2. **Sesion de tutoria** - Chat con timer, el tutor hace preguntas socraticas
3. **Fase de cierre** - Cuando quedan <2 min, el tutor cierra la conversacion
4. **Feedback/Diagnostico** - Al terminar, genera evaluacion detallada por concepto

## Limitaciones Conocidas
- Gemini 2.5 Flash a veces tiene alta demanda (hay fallback a 2.0)
- El parsing de PDF puede fallar con PDFs complejos o escaneados
- No hay persistencia de sesiones (se pierden al cerrar)
- No hay autenticacion de usuarios

## Variables de Entorno
- `GOOGLE_GENERATIVE_AI_API_KEY` - API key de Google AI Studio
- `GEMINI_MODEL` - (opcional) modelo a usar, default gemini-2.0-flash

## URLs
- **Produccion**: https://socratesai-two.vercel.app
- **Repo**: https://github.com/guadadorna/SocratesAI

---

## Pendientes / Ideas Futuras
- [ ] Persistencia de sesiones (base de datos)
- [ ] Autenticacion de usuarios (profesor vs estudiante)
- [ ] Historial de sesiones por estudiante
- [ ] Exportar feedback como PDF
- [ ] Mejorar parsing de PDFs escaneados (OCR)
- [ ] Permitir multiples unidades/materias
- [ ] Dashboard con metricas de uso
- [ ] Modo "practica" sin timer

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

---

## Instrucciones para Claude
Cuando trabajes en este proyecto:
1. Actualiza este archivo al final de cada sesion con lo que se hizo
2. Mueve items de "Pendientes" a completado cuando se terminen
3. Agrega nuevos pendientes que surjan de la conversacion
4. Registra problemas y soluciones para no repetir errores
5. Si cambias algo del stack o arquitectura, actualiza las secciones correspondientes
