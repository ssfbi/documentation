# App offline de votaciones escolares

## Módulos separados

- `votante.html`: módulo votante (solo registro de votos).
- `admin.html`: módulo administrador (configuración y reportes).

## Clave fija administrador

La clave fija está en `app.js` como `MASTER_ADMIN_KEY`.

## Qué puede configurar el administrador

- Nombre de app.
- Logo (URL).
- Color principal.
- Sede de este equipo.
- Crear nuevas sedes.
- Activar/desactivar cargos para la votación.
- Añadir cargos nuevos.
- Añadir/quitar candidatos por cargo.
- Generar acta PDF para consolidar resultados entre computadores.

## Flujo sugerido

1. En cada computador, entrar a `admin.html` y configurar sede local.
2. Configurar cargos y candidatos que se usarán.
3. Usar `votante.html` para la jornada electoral.
4. Al final, generar acta PDF por sede/equipo y consolidar manualmente.
