# Codecov Backend

The backend for the [`@backstage-community/plugin-codecov`](../codecov/README.md)
plugin.

It acts as an **authenticated proxy** in front of the [Codecov](https://about.codecov.io/)
API: it reads the Codecov API token from the app config and resolves the
repository for an entity from the catalog, so the token is never exposed to the
frontend.

## Installation

```sh
# From your Backstage root directory
yarn --cwd packages/backend add @backstage-community/plugin-codecov-backend
```

Add the plugin to your backend in `packages/backend/src/index.ts`:

```ts
const backend = createBackend();
// ...
backend.add(import('@backstage-community/plugin-codecov-backend'));
// ...
backend.start();
```

## Configuration

Configure the Codecov API token (and optionally a custom base URL for
self-hosted Codecov) in your `app-config.yaml`:

```yaml
codecov:
  # Optional, defaults to https://api.codecov.io
  baseUrl: https://api.codecov.io
  # API token, create one in the Codecov UI under Settings > Access.
  # Prefer an environment variable so the token stays out of source control.
  token: ${CODECOV_API_TOKEN}
```

The token is marked as `secret` and is only ever used by this backend plugin.

## API

The plugin is mounted under `/api/codecov`:

| Method | Path                            | Description                                             |
| ------ | ------------------------------- | ------------------------------------------------------- |
| `GET`  | `/health`                       | Simple health check.                                    |
| `GET`  | `/entities/:entityRef/coverage` | Returns the Codecov coverage for the referenced entity. |

The `:entityRef` segment is a URL-encoded entity reference, e.g.
`component:default%2Fmy-service`. The entity must carry the `codecov.io/repo`
annotation (or fall back to `github.com/project-slug`) as described in the
[frontend README](../codecov/README.md#entity-annotation).

The coverage response is normalized to:

```jsonc
{
  "service": "github",
  "owner": "my-org",
  "repo": "my-service",
  "branch": "main",
  "language": "typescript",
  "private": false,
  "webUrl": "https://app.codecov.io/github/my-org/my-service",
  "totals": {
    "files": 100,
    "lines": 1000,
    "hits": 850,
    "misses": 100,
    "partials": 50,
    "coverage": 85,
    "branches": 80,
    "methods": 90
  }
}
```

`totals` is `null` when Codecov has no coverage data uploaded yet.

## Local development

Run `yarn start` in this directory to start a standalone backend with a mock
catalog. See [`dev/index.ts`](./dev/index.ts) for the available example
requests.
