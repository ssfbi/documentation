# App offline de votaciones escolares

## Módulos

- `votante.html`: registro de votos con orden fijo de cargos: **Personero -> Contralor -> Canciller**.
- `admin.html`: configuración total con clave fija `ADMIN-2026`.
- `registrador.html`: generación de actas y certificado con clave `REGISTRADOR2026`.

## Lo nuevo solicitado

- Logo y nombre del colegio en todos los módulos y en el acta/certificado.
- Carga de rutas de imágenes para candidatos (ej: `assets/foto-candidato.png`).
- Voto en blanco siempre al final y protegido para no eliminarse.
- Gestión de sedes y jornadas.
- Configuración de mesa automática por sede+jornada.
- Estadísticas por mesa/sede/jornada.
- Ganador por sede y ganador global en acta con formato grande.
- Módulo registrador detecta cuando votos están en 0.
- Zona de borrado protegida por clave `ELIMINARDATOS2026` para eliminar votos/candidatos.

## Uso

1. En `admin.html`, configurar marca, sedes, jornadas, mesas y candidatos.
2. En `votante.html`, registrar votos.
3. En `registrador.html`, generar acta PDF y certificado para consolidación.
