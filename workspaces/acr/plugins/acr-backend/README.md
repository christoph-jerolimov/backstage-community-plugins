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
    # Optional, selects the registry: `otherregistry` means otherregistry.azurecr.io,
    # a value with a dot is used as the full host
    azure-container-registry/registry-name: 'otherregistry'
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

Registries and their credentials are configured as connections of type
`azure-container-registry` in the root `connections` configuration of the
[Backstage connections service](https://backstage.io/docs/next/backend-system/core-services/connections/configuring-connections)
(BEP-14). Each entry has a `type`, the connection fields, an optional `title`
and `match`, and an `auth` array with one or more auth entries:

```yaml
connections:
  - type: azure-container-registry
    host: myregistry.azurecr.io
    auth:
      - method: basic
        username: ${ACR_USERNAME}
        password: ${ACR_PASSWORD}
  - type: azure-container-registry
    title: Other registry
    host: otherregistry.azurecr.io
    # Optional, defaults to https://<host>/acr/v1
    # apiBaseUrl: https://otherregistry.azurecr.io/acr/v1
    auth:
      - method: token
        token: ${ACR_TOKEN}
  # Connections of other types are left to the core connections service
  - type: github
    host: github.com
    auth:
      - method: token
        token: ${GITHUB_TOKEN}
```

> **Note:** `azure-container-registry` is not yet one of the
> [built-in connection types](https://backstage.io/docs/next/backend-system/core-services/connections/built-in-connection-types),
> and plugins can't register their own. This plugin therefore reads its
> entries from the root `connections` array itself, with the same validation
> rules as the connections service. The core connections service in
> `@backstage/backend-defaults` validates the whole array when the first
> plugin or module uses it, and rejects unknown types. If any other plugin or
> module in your backend uses the connections service, it fails with
> `Unrecognised connection type azure-container-registry` until the type is
> built in.

Connection fields:

| Field        | Required | Description                                                     |
| ------------ | -------- | --------------------------------------------------------------- |
| `host`       | Yes      | The registry host, for example `myregistry.azurecr.io`.         |
| `apiBaseUrl` | No       | The ACR REST API base URL, defaults to `https://<host>/acr/v1`. |

Auth methods:

| Method  | Fields                 | Header sent to ACR                         |
| ------- | ---------------------- | ------------------------------------------ |
| `none`  |                        | none                                       |
| `token` | `token`                | `Authorization: Bearer <token>`            |
| `basic` | `username`, `password` | `Authorization: Basic <username:password>` |

The lookup follows the connections service: the connection is selected by the
registry host, and the first auth entry visible to the `acr` plugin is used.
Auth entries with `match.plugins: [acr]` are preferred over entries without a
`match`, and connections or auth entries that `match` other plugins are
ignored. Default titles, validation, and error messages are the same as for
the built-in connection types.

Entities without a `azure-container-registry/registry-name` annotation use the
first connection. Otherwise the annotation selects the host: `myregistry`
becomes `myregistry.azurecr.io`, and a value with a dot is used as the host.

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
