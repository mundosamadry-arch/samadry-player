# 🎵 Cómo añadir canciones a las playlists

Las canciones de cada lista (Piratas, Exploradores, Bluey, Kpop, Spiderman…)
salen del archivo **`playlists.json`** que está en el hosting, junto a la app:

```
public_html/player/playlists.json
```

La app lo lee **cada vez que se abre**, así que en cuanto lo edites y subas,
todos los animadores ven las canciones nuevas (sin tocar el código).

---

## 1. Sube los MP3 a su carpeta

Dentro de `public_html/player/samadry-audio/` crea una carpeta por temática
(si no existe) y sube ahí los MP3:

```
samadry-audio/
├── juegos-generica/      ← ya existe
├── piratas/              ← crea esta y sube aquí los MP3 de piratas
├── exploradores/
├── bluey/
├── kpop/
└── spiderman/
```

**Consejo de nombres:** usa números delante y sin espacios ni tildes, por
ejemplo `01-cancion-pirata.mp3`, `02-otra-cancion.mp3`. Así salen ordenadas.

---

## 2. Edita `playlists.json`

Abre `playlists.json` en el File Manager de Hostinger (clic derecho → Editar).
Por cada canción, copia este bloque y cambia **solo 3 cosas**:

```json
{
  "title": "Lo que se ve en pantalla",
  "artist": "Mundo Samadry",
  "file": "piratas/01-cancion-pirata.mp3",
  "tag": "Piratas"
}
```

- **title** → el nombre que verá el animador
- **file** → la ruta dentro de `samadry-audio/` (carpeta/archivo.mp3)
- **tag** → la etiqueta pequeña (normalmente el nombre de la temática)

Si hay varias canciones, sepáralas con una coma. Ejemplo de la lista de piratas
con dos canciones:

```json
"piratas": [
  {
    "title": "El Barco Pirata",
    "artist": "Mundo Samadry",
    "file": "piratas/01-el-barco-pirata.mp3",
    "tag": "Piratas"
  },
  {
    "title": "Busca el Tesoro",
    "artist": "Mundo Samadry",
    "file": "piratas/02-busca-el-tesoro.mp3",
    "tag": "Piratas"
  }
],
```

> Tienes una plantilla completa con el formato relleno en **`playlists.ejemplo.json`**.
> Cópiala, edítala y guárdala como `playlists.json`.

---

## 3. Reglas importantes (para que no falle)

- ✅ La **última** canción de cada lista **NO** lleva coma al final.
- ✅ Cada lista va entre corchetes `[ ]`; una lista vacía es `[]`.
- ✅ Usa comillas dobles `"` siempre (no `'`).
- ✅ Nada de tildes ni espacios en los nombres de archivo (`file`).

Si algo no aparece, casi siempre es una **coma de más o de menos**. Puedes
comprobar que el archivo es válido pegándolo en https://jsonlint.com antes de subir.

---

## 4. Ya está

Recarga la app y las canciones aparecerán en su pestaña. No hace falta tocar
`app.js` ni `index.html`.
