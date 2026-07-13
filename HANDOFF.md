# Samadry Player - Estado del proyecto y traspaso

Ultima actualizacion: 2026-07-12

## Estado actual resumido

- GitHub Pages ya funciona en `https://mundosamadry-arch.github.io/`.
- La musica compartida se sirve desde `https://animacionesinfantilesmusicales.com/player/samadry-audio/`.
- Hay seis listas de hosting: Juegos, Piratas, Exploradores, Bluey, Kpop y Spiderman.
- `catalogo.html` permite generar `playlists.json` sin escribir JSON manualmente.
- El Modo Escenario permite elegir lista, reproducir, bajar volumen, activar voz, descargar una lista offline y lanzar efectos.
- La voz procesa solo frases terminadas, evita ordenes duplicadas y baja temporalmente la musica al reconocer "Samadry".
- Spotify sigue siendo opcional y requiere una cuenta Premium por animador.

Este documento resume que se ha hecho, donde esta cada cosa y que problemas quedan abiertos para que otro programador pueda continuar el proyecto.

## Objetivo del proyecto

Samadry Player es una app web estatica para animadores infantiles. Incluye:

- Reproductor de musica por playlists.
- Carga de canciones locales desde el navegador.
- Banco de sonidos.
- Temporizador de show.
- Notas locales.
- Integracion prevista con Spotify Premium.
- Asistente de voz.

La app principal esta hecha con HTML, CSS y JavaScript sin framework.

## Archivos principales

- `index.html`: estructura de la aplicacion.
- `index.css`: estilos visuales.
- `app.js`: logica completa de reproductor, soundboard, timers, Spotify y voz.
- `README.md`: instrucciones de uso.
- `package.json`: script para levantar servidor local.
- `.gitignore`: excluye `node_modules`, `.env` y zips.
- `.nojekyll`: indica a GitHub Pages que sirva archivos estaticos sin Jekyll.
- `.github/workflows/pages.yml`: workflow de GitHub Pages creado para intentar despliegue por Actions.

## Repositorios creados

### Repositorio principal del proyecto

URL:

```text
https://github.com/mundosamadry-arch/samadry-player
```

Remoto local:

```text
origin https://github.com/mundosamadry-arch/samadry-player.git
```

Ramas relevantes:

- `main`: codigo principal.
- `gh-pages`: rama creada para intentar publicar una version estatica limpia.

Commits principales:

- `ab94520` - Initial Samadry player app
- `abdba81` - Add GitHub Pages deployment
- `e05ce17` - Disable Jekyll for Pages
- `8f63dec` - Publish static site only
- `5e69fa2` - Trigger Pages deployment

### Repositorio de GitHub Pages raiz

Tambien se creo el repositorio especial de usuario:

```text
https://github.com/mundosamadry-arch/mundosamadry-arch.github.io
```

Este repo contiene una copia estatica minima de la app:

- `index.html`
- `index.css`
- `app.js`
- `.nojekyll`
- `.github/workflows/static.yml`

URL esperada si llega a publicar:

```text
https://mundosamadry-arch.github.io/
```

## Cambios importantes realizados

### 1. Git y GitHub

- Se inicializo Git en `/Users/samuelgutierrezmartinez/reproductor-animadores`.
- Se configuro usuario local de Git:
  - Nombre: `Mundo Samadry`
  - Email: `mundosamadry-arch@users.noreply.github.com`
- Se reconecto GitHub CLI como `mundosamadry-arch`.
- Se subio el proyecto a GitHub.
- Se intento publicar con GitHub Pages de varias formas.

### 2. Reproductor local

Problema inicial:

Las canciones locales cargadas por el usuario no sonaban y aparecia un error generico:

```text
Error al cargar la pista. Si estas offline, por favor arrastra tus propios archivos de musica a la seccion 'Mis MP3'.
```

Cambios aplicados:

- Se separo el modo de reproduccion local del modo Spotify mediante `activePlaybackSource`.
- Si el usuario selecciona una pista local, los controles ya no intentan usar Spotify.
- Se limpia la URL temporal anterior (`URL.revokeObjectURL`) al cambiar de pista.
- Se quito `crossorigin` fijo del elemento `<audio>` para archivos locales.
- Se cambio el flujo para que el audio nativo intente reproducir primero y despues se conecte el visualizador.
- Se añadieron mensajes de error mas concretos para formato no soportado, decodificacion, archivo no legible o bloqueo del navegador.
- Se filtran archivos locales segun MIME o extension (`mp3`, `wav`, `ogg`, `m4a`, `aac`, `flac`).

Estado actual:

No se ha validado con los archivos reales del usuario. Si sigue fallando, hay que probar con:

- Un MP3 conocido y simple.
- Chrome o Edge.
- Consola de navegador abierta.
- Revisar el mensaje exacto que aparece ahora, porque ya no deberia ser el generico.

### 3. Spotify

Problema:

Spotify no conectaba.

Causas encontradas:

- La app usaba el flujo antiguo `response_type=token`.
- Spotify recomienda/usara flujo OAuth con PKCE para apps web sin secreto.
- El README recomendaba `localhost`, pero Spotify no acepta `localhost` como Redirect URI en este contexto; se debe usar `127.0.0.1` o `[::1]`.

Cambios aplicados:

- Se migro el login de Spotify a PKCE:
  - `code_verifier`
  - `code_challenge`
  - intercambio de `code` por token.
- Se añadio refresh de token si hay `refresh_token`.
- Se cambio el redirect URI a:

```text
http://127.0.0.1:8080/
```

- Se actualizo `package.json`:

```json
"start": "npx http-server -a 127.0.0.1 -p 8080"
```

- Se actualizo `README.md` con `http://127.0.0.1:8080`.

Pendiente:

- En Spotify Developer Dashboard hay que configurar exactamente:

```text
http://127.0.0.1:8080/
```

- Probar con una cuenta Spotify Premium real.
- Confirmar que el SDK Web Playback carga correctamente.

## Problemas abiertos

### Problema A: GitHub Pages (resuelto)

El sitio raiz ya publica correctamente. La informacion historica siguiente se conserva para explicar los intentos anteriores.

URLs probadas:

```text
https://mundosamadry-arch.github.io/samadry-player/
https://mundosamadry-arch.github.io/
```

Ambas han dado 404 durante las pruebas.

Se intento:

1. Activar Pages en `samadry-player` desde `main`.
2. Cambiar a `gh-pages`.
3. Añadir `.nojekyll`.
4. Limpiar `gh-pages` para que solo tenga archivos estaticos.
5. Crear workflow de GitHub Actions para Pages.
6. Crear repositorio especial `mundosamadry-arch.github.io`.
7. Publicar archivos estaticos ahi.
8. Crear workflow `static.yml`.
9. Cambiar permisos de Actions a lectura/escritura con aprobacion expresa del usuario.
10. Intentar lanzar workflow manualmente y por push.

Estado observado:

- GitHub Pages aparece como `building` por API, pero no termina.
- Builds legacy acaban como `Page build failed` o quedan en `building`.
- GitHub Actions detecta el workflow, pero no genera ejecuciones.
- Al pulsar `Run workflow` en GitHub, aparece:

```text
Failed to queue workflow run. Please try again.
```

Esto parece bloqueo/configuracion interna de GitHub, no problema directo del codigo de la app.

Siguiente paso recomendado:

- Si se quiere seguir con GitHub Pages: revisar con calma settings de Actions/Pages de la cuenta `mundosamadry-arch`, o probar desde otra cuenta GitHub.
- Si se quiere tener enlace publico rapido: desplegar en Netlify o Vercel. La app es estatica y deberia funcionar subiendo `index.html`, `index.css` y `app.js`.

### Problema B: reproduccion local no validada con archivos reales

Aunque se aplicaron mejoras, el usuario reporto que seguia fallando. Hay que probar con sus archivos reales o pedir:

- Extension y codec real del archivo.
- Navegador usado.
- Mensaje exacto actual tras los ultimos cambios.
- Logs de consola.

Puede ser que los archivos sean:

- M4A/MP4 con codec no soportado por el navegador.
- Archivos de Apple Music protegidos.
- Archivos en iCloud/Drive no disponibles localmente.
- Archivos con MIME vacio o raro.

### Problema C: Spotify pendiente de prueba real

La migracion a PKCE esta implementada, pero falta comprobar:

- Redirect URI en Spotify Dashboard.
- Cuenta Premium.
- Permisos concedidos.
- Token devuelto.
- Que el SDK `https://sdk.scdn.co/spotify-player.js` carga en el navegador.

## Comandos utiles

Levantar localmente:

```bash
npm start
```

Abrir:

```text
http://127.0.0.1:8080
```

Ver estado Git:

```bash
git status
```

Subir cambios al repo principal:

```bash
git add .
git commit -m "Descripcion del cambio"
git push origin main
```

Comprobar GitHub CLI:

```bash
gh auth status
```

## Recomendacion para continuar

Prioridad sugerida:

1. Probar localmente la app con archivos MP3 reales y Chrome.
2. Resolver reproduccion local antes que Spotify.
3. Publicar en Netlify/Vercel para tener enlace publico rapido.
4. Volver a GitHub Pages solo si se quiere investigar el bloqueo de Actions/Pages.
5. Probar Spotify con `http://127.0.0.1:8080/` configurado en Spotify Developer Dashboard.

## Nota importante sobre privacidad

No se subieron canciones locales al repositorio. La app carga canciones desde el navegador del usuario, en memoria local. El zip `samadry-player-deploy.zip` quedo excluido por `.gitignore`.
