# Nexus Repository Manager backend plugin for Backstage

This backend plugin loads the build artifacts of a catalog entity from Nexus Repository Manager. The Nexus credentials stay in the backend, and the entity is read from the catalog with the credentials of the caller, so catalog permissions apply.

It provides:

- An HTTP API that returns the Nexus components of an entity.
- The `nexus-repository-manager:get-entity-components` action for the Backstage actions registry, for example for the MCP actions backend.

## Installation

Install the package in your backend:

```bash
yarn --cwd packages/backend add @backstage-community/plugin-nexus-repository-manager-backend
```

Add the plugin to your backend in `packages/backend/src/index.ts`:

```ts
const backend = createBackend();
// ...
backend.add(
  import('@backstage-community/plugin-nexus-repository-manager-backend'),
);
```

The plugin depends on the catalog plugin.

## Configuration

Nexus Repository Manager instances are configured as connections, in the same format as the Backstage `connections` configuration. They live under `nexusRepositoryManager.connections` because the root `connections` configuration only accepts the connection types that are built into Backstage.

```yaml title="app-config.yaml"
nexusRepositoryManager:
  connections:
    - title: Nexus Repository Manager
      host: nexus.example.com
      # Optional, defaults to https://<host>
      baseUrl: https://nexus.example.com
      auth:
        - method: token
          token: ${NEXUS_TOKEN}
```

The supported auth methods are:

| Method  | Fields                 | Sent as                         |
| ------- | ---------------------- | ------------------------------- |
| `none`  |                        | No `Authorization` header       |
| `token` | `token`                | `Authorization: Bearer <token>` |
| `basic` | `username`, `password` | `Authorization: Basic ...`      |

The first auth entry of a connection is used.

Set `nexusRepositoryManager.experimentalAnnotations` to `true` to also search with the experimental annotations, the same as in the frontend plugin.

## Annotations

The plugin uses the same annotations as the frontend plugin, for example:

```yaml title="catalog-info.yaml"
metadata:
  annotations:
    nexus-repository-manager/docker.image-name: org/app
    # Optional, overrides the title
    nexus-repository-manager/config.title: My app
    # Optional, selects the connection by host when several are configured.
    # The first connection is used otherwise.
    nexus-repository-manager/host: nexus.example.com
```

## HTTP API

### `GET /api/nexus-repository-manager/components?entityRef=<entityRef>`

Returns the Nexus components of the entity:

```json
{
  "entityRef": "component:default/my-app",
  "title": "org/app",
  "connection": {
    "title": "Nexus Repository Manager",
    "host": "nexus.example.com",
    "baseUrl": "https://nexus.example.com"
  },
  "components": [
    {
      "component": {
        "id": "...",
        "repository": "docker-hosted",
        "format": "docker",
        "name": "org/app",
        "version": "1.0.0",
        "assets": []
      },
      "dockerManifests": []
    }
  ]
}
```

- Maven assets include their file size, which the Nexus search API doesn't return.
- Docker components include one image manifest per asset, or `null` if a manifest couldn't be loaded.
- Components with only secondary assets, such as checksums or POM files, are left out.

The API responds with `400` if the entity ref is missing or invalid or the entity has no Nexus annotations, and with `404` if the entity or a matching connection isn't found.

## Actions

| Action                                           | Input       | Output                        |
| ------------------------------------------------ | ----------- | ----------------------------- |
| `nexus-repository-manager:get-entity-components` | `entityRef` | The same response as the API. |

## Development

Start the plugin standalone, with mocked auth and a mocked catalog, from this package:

```bash
NEXUS_HOST=nexus.example.com NEXUS_TOKEN=... yarn start
curl 'http://localhost:7007/api/nexus-repository-manager/components?entityRef=component:default/sample'
```
