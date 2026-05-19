# Skill: Cierre de Sesión

Al ejecutar este skill, Claude debe actualizar `.claude/skills/proyecto.md` con el registro de la sesión actual.

## Pasos obligatorios

1. **Leer** `.claude/skills/proyecto.md` para ver el estado actual
2. **Agregar una entrada** en "Registro de Sesiones" con este formato:

```
### YYYY-MM-DD - Sesion con [nombre] (branch [branch])
**Lo que se hizo:**
- [lista de cambios realizados en esta sesion]

**Problemas encontrados:**
- [errores o bloqueantes que aparecieron, o "Ninguno"]

**Decisiones de diseno:**
- [decisiones importantes tomadas, o omitir la seccion si no hubo ninguna]
```

3. **Actualizar pendientes completados**: en la seccion "Pendientes / Ideas Futuras", **eliminar** los items que se terminaron durante la sesion (no tacharlos), y agregar la funcionalidad en la seccion "Funcionalidades Actuales" con una descripcion breve

4. **Agregar nuevos pendientes** que hayan surgido durante la sesion

5. **Actualizar secciones de contexto** si cambio algo del stack, arquitectura, variables de entorno o estructura de archivos

## Reglas

- Usar la fecha actual del sistema (disponible en el contexto como `currentDate`)
- Ser especifico en "Lo que se hizo": mencionar archivos modificados si es relevante
- No inventar problemas ni decisiones si no los hubo
- La entrada nueva va DESPUES de las entradas anteriores (orden cronologico ascendente, la mas reciente al final)
