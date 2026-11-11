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

Connections use the same format as the Backstage `connections` configuration: a `host`, an optional `title`, and a list of `auth` methods. The first auth method in the list is used.

```yaml title="app-config.yaml"
jfrogArtifactory:
  connections:
    - host: mycompany.jfrog.io
      auth:
        - method: token
          token: ${JFROG_ARTIFACTORY_TOKEN}
    - host: artifactory.example.com:8082
      # Optional, defaults to https://<host>
      baseUrl: http://artifactory.example.com:8082
      title: Internal Artifactory
      auth:
        - method: basic
          username: ${JFROG_USERNAME}
          password: ${JFROG_PASSWORD}

  # Optional settings, shared with the frontend plugin
  # Sort field for tags: 'NAME_SEMVER' (default) or 'MODIFIED'
  sortField: MODIFIED
  # Default repository filter, used when an entity has no repo-filter annotation
  repoFilter: '*-prod-federated'
  # Maximum number of tags to load (default: 100)
  pageLimit: 100
```

Supported auth methods:

| Method  | Fields                 | Description                                    |
| ------- | ---------------------- | ---------------------------------------------- |
| `token` | `token`                | Access or identity token, sent as Bearer token |
| `basic` | `username`, `password` | Basic authentication                           |
| `none`  |                        | Anonymous access                               |

## Entity annotations

```yaml title="catalog-info.yaml"
metadata:
  annotations:
    # Required: the docker image name
    jfrog-artifactory/image-name: 'my-image'
    # Optional: only search repositories matching this pattern
    jfrog-artifactory/repo-filter: '*-prod-federated'
    # Optional: the host of the connection to use, defaults to the first configured connection
    jfrog-artifactory/host: 'artifactory.example.com:8082'
```

## API

### `GET /api/jfrog-artifactory/tags?entityRef=<entity ref>`

Loads the entity from the catalog, on behalf of the calling user or service, and returns its image tags. The response has the same shape as the JFrog metadata GraphQL `versions` query that the frontend plugin uses.

Returns `400` when the entity ref is missing or the entity has no `jfrog-artifactory/image-name` annotation, and `404` when the entity does not exist or the user is not allowed to see it.

## Actions

The plugin registers the `jfrog-artifactory:get-image-tags` action in the actions registry. It takes an `entityRef` and returns the image name, the queried host, and the list of tags with their dates, size, download count, repositories, licenses, vulnerability counts and files.
