# Bayern D.L.Caninos

Panel web para consultar la plantilla, estadísticas, calendario y clasificación. La base usa Next.js App Router, TypeScript, Tailwind CSS y Supabase (Auth + PostgreSQL).

## Empezar

1. Instala Node.js 20.9 o superior y ejecuta `npm install`.
2. Crea un proyecto en Supabase (elige una región cercana al equipo).
3. Sigue la sección **Conectar Supabase** de abajo.
4. El video de bienvenida ya está en `public/videos/introEdit.MP4`.
5. Ejecuta `npm run dev` y abre `http://localhost:3000`.

## Conectar Supabase

No hace falta crear las tablas a mano. En el proyecto Supabase, abre **SQL Editor → New query** y ejecuta, en orden, los archivos de `supabase/migrations/`. La migración inicial crea:

- `perfiles`: usuario autenticado, rol (`compañero` o `admin`) y vínculo opcional con su jugador.
- `jugadores`: nombre, posición, dorsal y URL de foto.
- `partidos`: temporada, jornada, fecha, equipos, resultado y estadio.
- `estadisticas`: goles, asistencias, acciones a balón parado y tarjetas por jugador y partido.
- `convocatorias`: estado de convocatoria por jugador y partido (convocado o no convocado).
- `clasificacion`: posiciones y puntos calculados al importar resultados.
- Políticas RLS, creación automática del perfil al registrarse y la función transaccional `importar_jornada`.

La migración `202610170001_public_dashboard.sql` permite a visitantes sin cuenta consultar jugadores, partidos, estadísticas y clasificación. La migración `202610180001_first_phase_calendar.sql` separa los datos por fase y grupo e inserta los 66 partidos de Campeón de Invierno. La migración `202610180002_confirmed_schedule_and_callups.sql` conserva las fechas del calendario como previsiones, añade convocatorias y separa los resultados del horario confirmado. La migración `202610180003_players_and_match_statistics.sql` carga la lista inicial de 15 jugadores sin inventar dorsal o posición, permite vídeos en sus fichas y añade estadísticas individuales. La migración `202610180004_import_player_roster.sql` habilita la actualización segura de dorsales y posiciones desde el CSV de jugadores. La migración `202610180005_pending_callups.sql` permite importar convocatorias antes de confirmar fecha, hora y campo. La migración `202610180006_convocados_without_appearances.sql` elimina el campo de participación y permite registrar convocados y no convocados. La migración `202610180007_competition_scoped_statistics.sql` aplica también el aislamiento por fase y grupo a las estadísticas. La migración `202610180008_public_statistics_match_reference.sql` permite a visitantes consultar la referencia al partido necesaria para filtrar y mostrar estadísticas públicas. La migración `202610190001_match_callup_photos.sql` añade la URL opcional de la foto de equipo a cada partido. Ejecuta todas las migraciones pendientes en orden.

Para añadir una foto de convocatoria, súbela a un bucket público de Supabase Storage y copia su URL pública en `partidos.foto_convocatoria_url` para el partido correspondiente. La imagen se muestra automáticamente en la tarjeta de ese partido con proporción 4:3; si el campo está vacío, no se muestra nada. No hace falta modificar el CSV de convocatoria.

En **Project Settings → API** copia la Project URL y la clave publicable (`sb_publishable_...`; en proyectos antiguos puede aparecer como `anon`). En la carpeta raíz del proyecto, crea `.env.local` junto a `package.json`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU-CLAVE-PUBLICABLE
SUPABASE_SERVICE_ROLE_KEY=TU-CLAVE-SECRETA-DE-SERVIDOR
```

La clave de servidor **nunca** va en una variable `NEXT_PUBLIC_`, ni se pega en el chat ni en código del navegador. `.env.local` está excluido de Git. El código también acepta `NEXT_PUBLIC_SUPABASE_ANON_KEY` para proyectos o configuraciones anteriores. Reinicia `npm run dev` después de crear o cambiar este archivo.

## Desplegar en Cloudflare Workers

El proyecto usa `@opennextjs/cloudflare` para adaptar Next.js al runtime de Workers. No publiques la carpeta `out` ni uses solo `npm run build`: el build para Cloudflare se genera con `npm run build:cloudflare`.

### Configurar Workers Builds

Conecta el repositorio de GitHub a **Workers & Pages → Create application → Workers → Import a repository** y configura:

- **Root directory:** `/`
- **Build command:** `npm run build:cloudflare`
- **Deploy command:** `npx wrangler deploy`
- **Framework preset:** `None` / `Other` si aparece. El proyecto ya incluye `wrangler.jsonc`; no lo configures como Pages ni como exportación estática.

El nombre del Worker configurado es `bayerndeloscaninos` en `wrangler.jsonc`. El vínculo interno `WORKER_SELF_REFERENCE` usa el mismo nombre; configura Workers Builds para que despliegue este mismo Worker.

### Variables de entorno y secretos

En la configuración de Workers Builds, añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` como variables para el entorno de **build**. En el Worker, configura también esas variables en **Production**. Next.js incorpora las variables públicas en el bundle del navegador durante el build.

Añade `SUPABASE_SERVICE_ROLE_KEY` únicamente como **secret** del Worker, nunca como variable `NEXT_PUBLIC_` ni en el repositorio. La clave de servicio se usa solo en endpoints administrativos del servidor. Configura también las variables públicas en el entorno Production del Worker para que estén disponibles en el servidor.

Para probar en el runtime local de Workers, copia `.dev.vars.example` como `.dev.vars`, reemplaza los valores por los de Supabase y ejecuta `npm run preview`. `.dev.vars` está excluido de Git. Para desarrollo normal con `npm run dev`, sigue usando `.env.local`.

Tras conectar las variables en Cloudflare, cada push a la rama de producción ejecutará el build y despliegue. También puedes usar `npm run preview` para probar localmente o `npm run deploy` desde una terminal autenticada con Wrangler.

## Cargar los primeros datos

1. Ejecuta las migraciones pendientes en orden desde **SQL Editor**. No vuelvas a ejecutar migraciones que ya aplicaste.
2. En Supabase, crea el usuario administrador desde **Authentication → Users**. Si ya existe una cuenta para el administrador, puedes usarla.
3. En SQL Editor, asigna el rol de administrador a esa cuenta (el trigger crea su fila en `perfiles` al crear el usuario):

```sql
update public.perfiles
set rol = 'admin'
where email = 'TU-CORREO';
```

4. Para que solo exista el acceso previsto para administración, desactiva el registro público en **Authentication → Settings**. La web no ofrece registro de cuentas.
5. La migración `202610180003_players_and_match_statistics.sql` añade los 15 jugadores facilitados, con dorsal vacío y posición «Por definir».
6. Entra en `/admin`. Hay cuatro cargas independientes: resultados, fichas de jugadores, convocatoria/horario y estadísticas por jugador-partido. Las plantillas descargadas desde Administración se generan con los datos actuales de Supabase e incluyen los IDs de jugadores. Importa primero resultados, después fichas si las vas a actualizar, luego convocatoria y finalmente estadísticas. El panel público identifica las fechas iniciales como previsiones; la hora y el campo solo aparecen al importar la convocatoria.

La portada `/` muestra el video. Entrar abre `/equipo`, que es público y muestra los datos cargados. Administración solicita iniciar sesión y el servidor comprueba el rol antes de permitir `/admin` o procesar una importación. Las fotos pueden añadirse en `foto_url` (por ejemplo, con imágenes de un bucket público de Supabase Storage).

## Video de bienvenida

El video vertical de 720×1280 y unos 4,8 segundos se reproduce una vez al abrir la portada móvil. El archivo proporcionado está aquí:

```text
public/videos/introEdit.MP4
```

Los hotspots transparentes enlazan con Entrar y Admin. Su posición y tamaño se ajustan en `.intro-hotspot--enter` y `.intro-hotspot--admin`, en `src/app/globals.css`; `top`, `left`, `width` y `height` son porcentajes del marco. El video se adapta al alto visible y recorta los lados en móviles con una proporción más estrecha. Si no se puede reproducir, aparecen botones visibles como alternativa. Para publicar, incluye el MP4 en el despliegue; si pesa demasiado, puede servirse desde Supabase Storage.

## Estructura

```text
src/
  app/                  páginas y API Routes
  components/           dashboard y componentes visuales
  lib/                  clientes Supabase y lógica de importación
supabase/migrations/    esquema, políticas RLS y RPC transaccional
public/videos/          introEdit.MP4 y otros recursos locales
public/plantillas/      CSV fuente; organizar como <temporada>/<competicion>/
```

Las plantillas que se descargan desde Administración se generan con los datos actuales de Supabase y llevan temporada y competición en el nombre del archivo (por ejemplo, `resultados-liga-invierno-2026-2027.csv`). Partidos, convocatorias y estadísticas se relacionan mediante el partido; el partido tiene `temporada`, `fase` y `grupo`, por lo que esos datos se consultan/importan de forma separada. El endpoint de plantillas e importaciones acepta una fase explícita y grupo, mientras que la interfaz solo activa los formularios de invierno hasta que existan los calendarios confirmados de ascenso/descenso y Copa. La ficha de jugador (dorsal y posición) es común a todas las competiciones.

En `public/plantillas/`, los CSV fuente se organizan por temporada y competición, por ejemplo `public/plantillas/2026-2027/campeon-invierno/`. No se crean carpetas para competiciones pendientes hasta que tengan formatos y plantillas definidos. Las descargas generadas no se guardan en el repositorio.

## Importar resultados y convocatorias

Ambos endpoints solo aceptan solicitudes de perfiles con rol `admin` y archivos de hasta 5 MB. Las plantillas son CSV con separador punto y coma, se pueden abrir y editar en Excel, pero hay que guardarlas como CSV UTF-8 antes de subirlas. Los códigos de equipo estables se convierten a nombres al importar:

| Código | Equipo |
|---|---|
| BAY | Bayern D.L.Caninos |
| BLC | Barrio La Cañada |
| DAG | Daganzo Futsal |
| INT | Inter T.J. |
| LAG | Lagartos |
| LOC | Locotroes |
| MPT | Manchester Pity |
| SEV | Severo Torrejon |
| SPR | Sprinfield |
| TOR | Torrejon United |
| ZAR | Zarzuela XXI |
| ZEU | Zeus |

### Resultados

`GET /api/admin/templates?tipo=resultados&fase=campeon_invierno&grupo=` descarga la plantilla de esa fase y grupo con los marcadores actualmente guardados. `fase` y `grupo` también se envían en los formularios de importación; los códigos de fase permitidos se mantienen en `src/lib/competitions.ts`. Los CSV pueden identificar equipos por su nombre o código. Los marcadores vacíos conservan el resultado anterior. La carga **no establece ni cambia la fecha, la hora o el campo**; ese horario se actualiza en el archivo de convocatoria. Las estadísticas individuales se cargan por separado y la RPC las valida contra temporada, fase, grupo y partido.

### Convocatoria, fecha y campo

`GET /api/admin/players` descarga el CSV actual con UUID, dorsal y posición de los jugadores activos. Edita dorsal y posición y vuelve a subirlo mediante el mismo panel. `POST /api/admin/players` valida todas las filas antes de actualizar de forma transaccional; si cualquier jugador, posición o dorsal es inválido, no aplica cambios. Las posiciones válidas son `Portero`, `Cierre`, `Ala izquierda`, `Ala derecha`, `Pívot` y `Por definir`; el dorsal puede estar vacío o ser un número único entre 0 y 99.

`GET /api/admin/templates?tipo=convocatoria` descarga una fila por cada jugador activo y cada partido del Bayern; precarga fecha prevista solo como referencia, junto con horario confirmado si ya existe y las selecciones guardadas. Puedes importar convocatorias por adelantado con fecha/hora/campo vacíos. Cuando se confirme el horario, añade fecha y hora juntas y el campo una vez por partido. Importar con estos campos vacíos conserva cualquier horario confirmado que ya hubiese. Marca `convocado` como `sí` o `no` para cada jugador que quieras actualizar; las celdas vacías conservan el estado anterior. Las jornadas sin selecciones explícitas no modifican la convocatoria. El panel muestra por jornada la lista de convocados y no convocados, y las estadísticas pueden registrarse para cualquier convocado.

### Estadísticas por partido y totales de temporada

`GET /api/admin/templates?tipo=estadisticas` genera una fila por jugador y partido del Bayern, precargando las estadísticas guardadas. Completa las estadísticas de los convocados que tengan datos y deja en blanco las filas sin estadísticas (una fila con todos los valores a cero también se omite). `POST /api/admin/player-stats` importa `goles`, `asistencias`, penaltis/dobles penaltis, faltas directas y tarjetas. La función reemplaza el detalle estadístico solo de los partidos incluidos en la carga, de forma que las filas vacías del archivo descargado borran datos antiguos de esos partidos; las estadísticas de partidos no incluidos no cambian. Descarga siempre la última plantilla antes de editar para conservar los valores actuales. Solo se aceptan estadísticas de jugadores marcados como convocados (`convocado=sí`) en la jornada; no es necesario registrar una fila para todos los convocados ni haber participado en el partido. Los totales de temporada se calculan desde estas filas.

Las fotos se pueden asignar en `foto_url` y los clips en `video_url` después de alojarlos en una URL pública; las fichas reproducen los clips con controles y tienen una animación ligera de marco. Las cargas de jornada, convocatoria y estadísticas solo actualizan datos de temporada; la importación del CSV de jugadores actualiza dorsal y posición de los IDs incluidos y no crea ni elimina jugadores.

Las importaciones actualizan los partidos y recalculan la clasificación de la temporada, fase y grupo afectados dentro de transacciones. El esquema contempla fases para competiciones futuras. En la web, Liga de invierno ya tiene datos y herramientas de administración; Liga de ascenso/descenso y Copa aparecen como secciones pendientes. Sus importadores y plantillas específicas se implementarán cuando se confirmen sus formatos.

JSON de resultados:

```json
{
  "temporada": "2026-2027",
  "partidos": [{
    "jornada": 11,
    "equipo_local": "Bayern D.L.Caninos",
    "equipo_visitante": "Daganzo Futsal",
    "goles_local": 3,
    "goles_visitante": 1
  }]
}
```

Los nombres de equipo JSON deben coincidir con los nombres oficiales. La convocatoria es la fuente exclusiva de fecha definitiva, hora y campo.

CSV de resultados: se admiten separadores coma o punto y coma. Requiere `jornada,goles_local,goles_visitante` y los nombres de equipos (`equipo_local, equipo_visitante`) o códigos (`codigo_local,codigo_visitante`). Es opcional `temporada`. Deja vacíos ambos goles para conservar el resultado actual. No incluyas la fecha de previsión como horario definitivo.

CSV de convocatoria: requiere `temporada,jornada,codigo_local,codigo_visitante,fecha,hora,campo,jugador_id,convocado`. `convocado` acepta `sí`, `no` o vacío; vacío conserva el estado anterior. La fecha/hora y el campo solo hace falta indicarlos una vez por partido. La fecha y hora deben rellenarse juntas o dejarse ambas vacías.

CSV de estadísticas: requiere `temporada,jornada,codigo_local,codigo_visitante,jugador_id,goles,asistencias,penaltis_marcados,penaltis_tirados,dobles_penaltis_marcados,dobles_penaltis_tirados,faltas_directas_marcadas,amarillas,rojas`. Solo admite partidos del Bayern. Las estadísticas de jugador requieren que ese jugador figure como convocado en la convocatoria.

El dashboard no usa jugadores ni resultados de muestra. Los datos del equipo se consultan públicamente desde Supabase; solo la cuenta con rol de administrador puede importar jornadas y modificar datos mediante la herramienta. La clave secreta de servidor solo se utiliza en rutas del servidor y nunca debe incluirse en código del navegador.