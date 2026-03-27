# Contract: FlatScene JSON (v1)

## Purpose

Defines the generated/renderable `sceneJson` payload stored in `FlatScene.sceneJson`.

## Schema Version

- `schemaVersion`: `"1.0"`

## Payload

```json
{
  "schemaVersion": "1.0",
  "unit": "mm",
  "wallHeight": 3000,
  "wallThickness": 200,
  "floorPolygon": [{ "x": 0, "y": 0 }],
  "walls": [
    {
      "id": "wall-1",
      "start": { "x": 0, "y": 0 },
      "end": { "x": 1000, "y": 0 },
      "height": 3000,
      "thickness": 200
    }
  ],
  "openings": [
    {
      "id": "opening-1",
      "kind": "DOOR",
      "wallId": "wall-1",
      "center": { "x": 200, "y": 0 },
      "width": 900,
      "height": 2100
    }
  ],
  "materials": {
    "floor": "material-floor-default",
    "walls": "material-wall-default"
  }
}
```

## Rules

- Payload is renderer-facing; no DB IDs required except object references (`wallId`).
- Optional sections in v1: `openings`, `materials`.
- Any breaking field change requires contract version bump.

