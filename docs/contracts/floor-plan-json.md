# Contract: FloorPlan JSON (v1)

## Purpose

Defines the canonical `planJson` payload stored in `FloorPlan.planJson`.

## Schema Version

- `schemaVersion`: `"1.0"`

## Payload

```json
{
  "schemaVersion": "1.0",
  "polygon": [{ "x": 0, "y": 0 }],
  "walls": [
    {
      "start": { "x": 0, "y": 0 },
      "end": { "x": 1000, "y": 0 }
    }
  ],
  "openings": [
    {
      "id": "opening-1",
      "kind": "DOOR",
      "wallId": "wall-1",
      "offset": 200,
      "width": 900,
      "height": 2100
    }
  ],
  "rooms": [
    {
      "id": "room-1",
      "name": "Living Room",
      "polygon": [{ "x": 0, "y": 0 }]
    }
  ]
}
```

## Rules

- Coordinates are numeric and use project `unit`.
- `polygon` must have at least 3 points.
- `walls` must have at least 1 segment.
- `openings` and `rooms` are optional in v1, but if present must follow shape above.

