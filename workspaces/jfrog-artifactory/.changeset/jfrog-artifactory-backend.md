---
'@backstage-community/plugin-jfrog-artifactory-backend': minor
---

Added a new JFrog Artifactory backend plugin. It loads the image tags of a catalog entity through an API endpoint and through a `get-image-tags` action in the actions registry. JFrog Artifactory instances and credentials are configured as `jfrog` entries in the top-level `connections` config.
