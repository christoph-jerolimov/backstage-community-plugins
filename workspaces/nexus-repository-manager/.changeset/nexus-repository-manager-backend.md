---
'@backstage-community/plugin-nexus-repository-manager-backend': minor
'@backstage-community/plugin-nexus-repository-manager': patch
---

Added a Nexus Repository Manager backend plugin. It loads the Nexus components of a catalog entity through an HTTP API and through the `nexus-repository-manager:get-entity-components` action. Nexus instances and their credentials are configured in the root `connections` configuration, as connections of type `nexus`.
