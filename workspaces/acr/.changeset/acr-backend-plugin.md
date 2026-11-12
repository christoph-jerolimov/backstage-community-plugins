---
'@backstage-community/plugin-acr-backend': minor
---

Added a new backend plugin that loads Azure Container Registry image tags for a catalog entity. It provides an HTTP endpoint and an `acr:get-image-tags` action for the actions registry. Registries and their credentials are configured as `azure-container-registry` entries in the root `connections` configuration of the Backstage connections service.
