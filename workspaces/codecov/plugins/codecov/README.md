# Codecov

A Backstage frontend plugin that shows a **code coverage** card on the catalog
entity page, with data from [Codecov](https://about.codecov.io/).

The card displays the overall line coverage, a coverage bar and common
statistics (lines, files, hits, misses, partials and — when available — branch
coverage), plus a deep link to the repository on Codecov.

The plugin talks to the [`@backstage-community/plugin-codecov-backend`](../codecov-backend/README.md)
plugin, which proxies the authenticated Codecov API so the API token never
reaches the browser.

## Installation

This plugin is built for the Backstage [frontend system](https://backstage.io/docs/frontend-system/architecture/index).

1. Install the frontend and backend plugins:

   ```sh
   # From your Backstage root directory
   yarn --cwd packages/app add @backstage-community/plugin-codecov
   yarn --cwd packages/backend add @backstage-community/plugin-codecov-backend
   ```

2. Add the backend plugin to your backend (`packages/backend/src/index.ts`):

   ```ts
   backend.add(import('@backstage-community/plugin-codecov-backend'));
   ```

3. The frontend plugin is discovered automatically by the new frontend system.
   The `EntityCodecovCard` extension is enabled for entities that carry the
   `codecov.io/repo` annotation (see below). You can place it on an entity page
   or tune its visibility through app-config, for example:

   ```yaml
   app:
     extensions:
       - entity-card:codecov/entity: # enabled by default for annotated entities
   ```

## Entity annotation

Annotate the entities you want coverage for:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-service
  annotations:
    # service/owner/repo — service is one of github, gitlab, bitbucket
    codecov.io/repo: github/my-org/my-service
```

When only `owner/repo` is provided the `github` service is assumed. If the
annotation is missing, the plugin falls back to the well known
`github.com/project-slug` annotation.

## Configuration

The Codecov API token is configured in the **backend** plugin, see the
[backend README](../codecov-backend/README.md#configuration).

## Local development

Run `yarn start` in this directory to serve the plugin in isolation. The setup
lives in the [`/dev`](./dev) directory.
