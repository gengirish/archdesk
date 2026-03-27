# Contract: Cost Delta API (v1)

## Endpoint

- `POST /api/projects/:id/cost/delta`

## Request

```json
{
  "sceneId": "scene_cuid",
  "changes": [
    {
      "kind": "MATERIAL_SWAP",
      "targetType": "ROOM",
      "targetId": "room-1",
      "from": "tile-basic",
      "to": "tile-premium"
    }
  ]
}
```

## Response

```json
{
  "data": {
    "deltaAmount": 125000,
    "currency": "INR",
    "lineItems": [
      {
        "label": "Living Room Flooring",
        "amount": 125000
      }
    ],
    "totals": {
      "before": 1825000,
      "after": 1950000
    }
  },
  "error": null
}
```

## Rules

- Response follows ArchDesk envelope: `{ data, error }`.
- `deltaAmount` is `after - before`.
- All values are base INR (GST handling is downstream billing concern).

