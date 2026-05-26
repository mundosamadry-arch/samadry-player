# 🎵 SamadryPlayer - Reproductor para Animadores Infantiles

¡Bienvenido al **SamadryPlayer**! Esta es una aplicación web ligera, responsiva y diseñada específicamente para que los animadores de eventos infantiles musicales controlen todo su show en vivo desde una tablet, ordenador o portátil.

Esta versión incluye integración avanzada con **Spotify Premium** y un **Asistente de Voz Nivel Animación ("Oye Samadry")** que permite controlar efectos y reproducir canciones a manos libres sobre el escenario.

---

## 🚀 Cómo Iniciar la App (Obligatorio para Spotify)

Debido a que Spotify requiere políticas de seguridad estrictas de redirección OAuth, **no se puede abrir la app directamente haciendo doble clic en el archivo HTML (`file://`)**. Debe servirse desde un servidor local seguro:

### Opción Rápida con Node.js / NPM (Recomendado):
1. Asegúrate de tener Node.js instalado en tu ordenador.
2. Abre tu terminal de sistema en esta carpeta.
3. Ejecuta el comando:
   ```bash
   npm start
   ```
4. Abre tu navegador e ingresa a: **`http://127.0.0.1:8080`**

### Opción Alternativa (Sin Node.js instalado):
Puedes utilizar cualquier servidor web estático (como la extensión *Live Server* de Visual Studio Code) configurando el puerto en `8080`.

---

## 🟢 Configuración de Spotify Premium (Paso a Paso en 2 Minutos)

Para poder reproducir música directamente desde tu cuenta Premium de Spotify dentro de la app:

1. Ve a **[Spotify Developer Dashboard](https://developer.spotify.com/dashboard)** e inicia sesión con tu cuenta de Spotify.
2. Haz clic en **Create app** (Crear aplicación).
3. Rellena los campos:
   * **App name**: `Samadry Player`
   * **App description**: `Control de animaciones musicales infantiles`
   * **Redirect URIs**: Añade exactamente estas URLs (haz clic en Add despues de cada una):
     * **`https://mundosamadry-arch.github.io/`**
     * **`http://127.0.0.1:8080/`** (solo si tambien vas a probar en local)
4. Acepta los términos de uso y haz clic en **Save** (Guardar).
5. Entra en los detalles de tu nueva app creada y ve a **Settings** (Ajustes) para copiar el **Client ID** (es una clave larga de letras y números).
6. Abre la aplicación SamadryPlayer (`https://mundosamadry-arch.github.io/` o `http://127.0.0.1:8080`), haz clic en el engranaje **Ajustes (⚙️)** en el encabezado, pega tu Client ID y haz clic en **Guardar**.
7. Por último, haz clic en **Conectar Cuenta**. Se abrirá una ventana de Spotify para autorizar tu cuenta y te devolverá a la app ya conectada. ¡Listo!

---

## 🎤 Asistente de Voz "Oye Samadry"

Para activar el asistente de voz, haz clic en el icono del **Micrófono (🎙️)** en el encabezado y concede los permisos de micrófono al navegador. Cuando esté activo, el botón parpadeará en color rojo neón.

### 🎮 El Comando del Juego ("Preparados, Listos, Ya")
Este comando es **libre** (no requiere decir "Samadry" antes) para que sea súper dinámico e interactivo:
* **Di en voz alta**: *"¡Preparados, listos, ya!"* o *"¡Preparados, listos y ya!"*
* **Efecto**: La música actual se pausará de inmediato, aparecerá una **cuenta atrás gigante neón en pantalla (3, 2, 1...)** sincronizada con pitidos sonoros, y al llegar a "¡YA!" sonará una bocina y comenzará a sonar automáticamente la primera canción de la lista **Juegos** (ej. "Ritmo de Palmas") para empezar la dinámica.

### 🗣️ Comandos con Activador ("Oye Samadry")
Dí en voz alta el activador **"Samadry"** seguido de la acción:

#### 1. Reproducción Musical (Spotify / Local)
* *"Samadry, pon la canción de Chayanne Madre Tierra"* -> Buscará el tema en Spotify y lo reproducirá a través de la app. Si no estás conectado a Spotify, buscará coincidencias en tu playlist local de demostración.
* *"Samadry, pon la canción de Mundo Samadry"*
* *"Samadry, pausa"* o *"Samadry, para la música"* -> Detiene la canción activa.
* *"Samadry, reproduce"* o *"Samadry, continúa"* -> Reanuda la música.
* *"Samadry, siguiente"* o *"Samadry, salta"* -> Pasa a la siguiente canción de la lista.
* *"Samadry, anterior"* -> Vuelve a la canción previa.

#### 2. Lanzamiento de Efectos de Sonido
Ideal cuando tienes las manos ocupadas con globos, maquillaje o micrófonos:
* *"Samadry, aplausos"* -> Dispara el efecto 1 (Aplausos 👏)
* *"Samadry, redoble"* -> Dispara el efecto 2 (Redoble de tambores 🥁)
* *"Samadry, magia"* -> Dispara el efecto 3 (Efecto mágico 🪄)
* *"Samadry, bocina"* -> Dispara el efecto 4 (Bocina cómica 🎺)
* *"Samadry, risas"* -> Dispara el efecto 5 (Risas de niños 😆)
* *"Samadry, suspenso"* -> Dispara el efecto 6 (Tensión musical 🕵️)
* *"Samadry, ding"* -> Dispara el efecto 7 (Ding de éxito 🔔)
* *"Samadry, fallo"* -> Dispara el efecto 8 (Error / Explosión 💥)
* *"Samadry, silbato"* -> Dispara el efecto 9 (Silbato de árbitro 🗣️)

---

## ⌨️ Atajos de Teclado (Alternativos)
Si estás controlando la mesa de mezclas desde un portátil, puedes usar las teclas numéricas:

| Tecla | Acción | Efecto / Función |
|:---:|---|---|
| **Espacio** | Play / Pause | Controlar la lista de música de fondo. |
| **1** a **9** | Disparar Pads | Disparar del Pad 1 al Pad 9 respectivamente. |
