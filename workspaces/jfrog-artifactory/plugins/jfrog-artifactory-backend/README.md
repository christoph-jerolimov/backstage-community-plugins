# JFrog Artifactory backend plugin

This backend plugin loads container image information from [JFrog Artifactory](https://jfrog.com/artifactory/) for catalog entities. It provides:

- a REST API that the JFrog Artifactory frontend plugin, or any other client, can call with an entity ref
- a `get-image-tags` action in the Backstage actions registry, so that users and AI agents (for example through the MCP actions backend) can load the same information

JFrog Artifactory hosts and credentials are configured in the backend only. They are never sent to the browser.

## Installation

```bash
yarn --cwd packages/backend add @backstage-community/plugin-jfrog-artifactory-backend
```

```ts title="packages/backend/src/index.ts"
backend.add(import('@backstage-community/plugin-jfrog-artifactory-backend'));
```

## Configuration

JFrog Artifactory instances are configured as `jfrog-artifactory` entries in the top-level `connections` list, the configuration of the [Backstage connections service](https://github.com/backstage/backstage/blob/master/beps/0014-connection-service/README.md). Each entry has a `type`, an optional `title`, the connection fields, and a list of `auth` methods.

```yaml title="app-config.yaml"
connections:
  - type: jfrog-artifactory
    host: mycompany.jfrog.io
    auth:
      - method: token
        token: ${JFROG_ARTIFACTORY_TOKEN}
  - type: jfrog-artifactory
    title: Internal Artifactory
    host: artifactory.example.com:8082
    # Optional, defaults to https://<host>
    baseUrl: http://artifactory.example.com:8082
    auth:
      - method: basic
        username: ${JFROG_USERNAME}
        password: ${JFROG_PASSWORD}

jfrogArtifactory:
  # Optional settings, shared with the frontend plugin
  # Sort field for tags: 'NAME_SEMVER' (default) or 'MODIFIED'
  sortField: MODIFIED
  # Default repository filter, used when an entity has no repo-filter annotation
  repoFilter: '*-prod-federated'
  # Maximum number of tags to load (default: 100)
  pageLimit: 100
```

> [!WARNING]
> The Backstage connections service does not include a `jfrog-artifactory` connection type yet, so this plugin reads its own entries from the `connections` list. The connections service is still experimental and, at the time of writing, only used by example plugins. If your backend includes a plugin that uses the connections service, that service rejects the `jfrog-artifactory` entries with an `Unrecognised connection type` error at startup.

Supported auth methods:

| Method  | Fields                 | Description                                    |
| ------- | ---------------------- | ---------------------------------------------- |
| `token` | `token`                | Access or identity token, sent as Bearer token |
| `basic` | `username`, `password` | Basic authentication                           |
| `none`  |                        | Anonymous access                               |

As in the rest of the connections config, a connection and each auth entry can have a `match` block that restricts it to specific plugins, for example `match: { plugins: [jfrog-artifactory] }`. Auth entries that match the plugin are preferred, otherwise the first entry is used.

## Entity annotations

```yaml title="catalog-info.yaml"
metadata:
  annotations:
    # Required: the docker image name
    jfrog-artifactory/image-name: 'my-image'
    # Optional: only search repositories matching this pattern
    jfrog-artifactory/repo-filter: '*-prod-federated'
    # Optional: the host of the connection to use (as in its `host` field),
    # defaults to the first configured connection
    jfrog-artifactory/host: 'artifactory.example.com:8082'
```

## API

### `GET /api/jfrog-artifactory/tags?entityRef=<entity ref>`

Loads the entity from the catalog, on behalf of the calling user or service, and returns its image tags. The response has the same shape as the JFrog metadata GraphQL `versions` query that the frontend plugin uses.

Returns `400` when the entity ref is missing or the entity has no `jfrog-artifactory/image-name` annotation, and `404` when the entity does not exist or the user is not allowed to see it.

## Actions

The plugin registers the `jfrog-artifactory:get-image-tags` action in the actions registry. It takes an `entityRef` and returns the image name, the queried host, and the list of tags with their dates, size, download count, repositories, licenses, vulnerability counts and files.
