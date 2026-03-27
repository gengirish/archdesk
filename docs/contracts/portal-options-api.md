# Contract: Portal Options API (v1)

## Endpoints

- `GET /api/portal/:token/options`
- `POST /api/portal/:token/options/:optionId/decision`

## Option Shape

```json
{
  "id": "opt-1",
  "title": "Balanced",
  "summary": "Optimized comfort and cost",
  "thumbnailUrl": "https://...",
  "estimatedCost": 4200000,
  "estimatedTimelineDays": 180,
  "sceneId": "scene_cuid",
  "highlights": ["Premium tile in living area", "Modular kitchen included"]
}
```

## GET Response

```json
{
  "data": {
    "projectId": "project_cuid",
    "options": []
  },
  "error": null
}
```

## POST Decision Request

```json
{
  "outcome": "APPROVED",
  "comment": "Proceed with this option",
  "respondentName": "Client Name"
}
```

## POST Decision Response

```json
{
  "data": {
    "decisionId": "decision_cuid",
    "optionId": "opt-1",
    "outcome": "APPROVED",
    "recordedAt": "2026-03-27T00:00:00.000Z"
  },
  "error": null
}
```

## Rules

- Token scoped, no Clerk auth.
- Approved option should be immutable unless reopened by staff.
- Decision action is idempotent with `Idempotency-Key` support.

