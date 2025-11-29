# ISBN Scanner

A small desktop app built with Tauri to keep a library catalog with ease.

## Dev

The project uses `pnpm`.

To build the app and the frontend for development:

```bash
pnpm tauri
```

## Build

To build a production binary.

```bash
pnpm tauri build
```

There's also a GH workflow that builds for Mac and Windows.
It doesn't build for Linux cause I don't need it for the time being, though I would expect it's trivial to add.

# License

Everything is licensed under APGLv3.
