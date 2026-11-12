---
'@backstage-community/plugin-acr-backend': minor
---

Added a new backend plugin that loads Azure Container Registry image tags for a catalog entity. It provides an HTTP endpoint and an `acr:get-image-tags` action for the actions registry. Registries and their credentials are configured under `acr.connections` as `azure-container-registry` connections, using the same format as the Backstage connections configuration.
