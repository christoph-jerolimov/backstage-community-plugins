# Azure Container Registry backend plugin

This backend plugin loads container image information from Azure Container
Registry (ACR) for catalog entities. It provides:

- an HTTP endpoint that returns the image tags for a catalog entity
- an action for the Backstage actions registry that returns the same
  information, for example for MCP clients

Entities are annotated the same way as for the
[ACR frontend plugin](../acr/README.md):

```yaml
metadata:
  annotations:
    azure-container-registry/repository-name: 'team/my-image'
    # Optional, selects one of the configured connections by `name` or `host`
    azure-container-registry/registry-name: 'other-registry'
```

## Installation

```bash
# From your root directory
yarn --cwd packages/backend add @backstage-community/plugin-acr-backend
```

Then add the plugin to your backend in `packages/backend/src/index.ts`:

```ts
const backend = createBackend();
// ...
backend.add(import('@backstage-community/plugin-acr-backend'));
```

## Configuration

Registries and their credentials are configured as connections. The format is
the same as the top-level `connections` configuration of the
[Backstage connections service](https://backstage.io/docs/next/backend-system/core-services/connections/configuring-connections).
The core connections service only accepts its built-in connection types, so
for now the ACR connections are read from `acr.connections`:

```yaml
acr:
  connections:
    - type: acr
      host: myregistry.azurecr.io
      auth:
        - method: basic
          username: ${ACR_USERNAME}
          password: ${ACR_PASSWORD}
    - type: acr
      host: otherregistry.azurecr.io
      # Optional, matched against the `azure-container-registry/registry-name` annotation
      name: other-registry
      # Optional, defaults to https://<host>/acr/v1
      # apiBaseUrl: https://otherregistry.azurecr.io/acr/v1
      auth:
        - method: token
          token: ${ACR_TOKEN}
```

The supported auth methods are:

| Method  | Fields                 | Header sent to ACR                         |
| ------- | ---------------------- | ------------------------------------------ |
| `none`  |                        | none                                       |
| `token` | `token`                | `Authorization: Bearer <token>`            |
| `basic` | `username`, `password` | `Authorization: Basic <username:password>` |

As with the connections service, `title` and `match.plugins` can be set on a
connection and on each auth entry.

Entities without a `azure-container-registry/registry-name` annotation use the
first connection. Otherwise, the annotation value is matched against the
connection `name`, the `host`, and then `<value>.azurecr.io`.

## HTTP API

```
GET /api/acr/tags?entityRef=component:default/my-service&limit=100
```

| Query parameter | Description                                           |
| --------------- | ----------------------------------------------------- |
| `entityRef`     | Required. The catalog entity to load image tags for.  |
| `limit`         | Optional. Number of tags, 1 to 1000, defaults to 100. |

The entity is loaded from the catalog with the caller's credentials, so callers
only get information for entities they are allowed to read. The response has
the same format as the ACR `_tags` REST API, newest tags first:

```json
{
  "registry": "myregistry.azurecr.io",
  "imageName": "team/my-image",
  "tags": [
    {
      "name": "latest",
      "digest": "sha256:...",
      "createdTime": "2024-01-01T00:00:00Z",
      "lastUpdateTime": "2024-01-01T00:00:00Z",
      "signed": false,
      "changeableAttributes": {
        "deleteEnabled": true,
        "listEnabled": true,
        "readEnabled": true,
        "writeEnabled": true
      }
    }
  ]
}
```

## Actions

The plugin registers the following action in the actions registry:

| Action               | Input                 | Output                          |
| -------------------- | --------------------- | ------------------------------- |
| `acr:get-image-tags` | `entityRef`, `limit?` | `registry`, `imageName`, `tags` |
