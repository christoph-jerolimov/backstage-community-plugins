---
'@backstage-community/plugin-nexus-repository-manager-backend': minor
'@backstage-community/plugin-nexus-repository-manager': patch
---

Added a Nexus Repository Manager backend plugin. It loads the Nexus components of a catalog entity through an HTTP API and through the `nexus-repository-manager:get-entity-components` action. Nexus instances and their credentials are configured as connections of type `nexus-repository-manager` under `nexusRepositoryManager.connections`, in the format of the Backstage connections service.
