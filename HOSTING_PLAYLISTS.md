# Listas de canciones en Hostinger

La app lee las listas desde este archivo publico:

```text
https://animacionesinfantilesmusicales.com/samadry-audio/playlists.json
```

## Carpetas que debes crear

Dentro de Hostinger, en:

```text
public_html/samadry-audio/
```

Crea estas carpetas:

```text
public_html/samadry-audio/juegos-generica/
public_html/samadry-audio/piratas/
public_html/samadry-audio/exploradores/
public_html/samadry-audio/bluey/
public_html/samadry-audio/kpop/
public_html/samadry-audio/spiderman/
```

## Archivo playlists.json

En la carpeta:

```text
public_html/samadry-audio/
```

sube un archivo llamado exactamente:

```text
playlists.json
```

Puedes partir de `playlists.example.json`.

Ejemplo:

```json
{
  "juegos": [
    {
      "title": "I'm Still Standing",
      "artist": "Mundo Samadry",
      "file": "juegos-generica/01-I_m_Still_Standing.mp3",
      "tag": "Juegos Generica"
    }
  ],
  "piratas": [
    {
      "title": "Cancion Pirata 1",
      "artist": "Mundo Samadry",
      "file": "piratas/01-Cancion_Pirata.mp3",
      "tag": "Piratas"
    }
  ],
  "exploradores": [],
  "bluey": [],
  "kpop": [],
  "spiderman": []
}
```

## Reglas para nombres de archivos

Usa nombres sin espacios, sin acentos y sin simbolos raros.

Bien:

```text
01-Cancion_Pirata.mp3
02-Baile_Explorador.mp3
03-Kpop_Game.mp3
```

Evitar:

```text
02-Canción Pirata!.mp3
```

## Como actualizar listas

1. Sube los MP3 a la carpeta correcta.
2. Edita `playlists.json`.
3. Guarda/sube el archivo.
4. Abre la app y recarga fuerte con `Cmd + Shift + R`.

No hace falta tocar GitHub ni el codigo cada vez que subas canciones nuevas, siempre que actualices `playlists.json`.
