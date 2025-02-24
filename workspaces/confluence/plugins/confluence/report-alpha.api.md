## API Report File for "@backstage-community/plugin-confluence"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts
import { ConfigurableExtensionDataRef } from '@backstage/frontend-plugin-api';
import { ExtensionDefinition } from '@backstage/frontend-plugin-api';
import { FrontendPlugin } from '@backstage/frontend-plugin-api';
import { RouteRef } from '@backstage/frontend-plugin-api';
import { SearchResultItemExtensionComponent } from '@backstage/plugin-search-react/alpha';
import { SearchResultItemExtensionPredicate } from '@backstage/plugin-search-react/alpha';
import { SearchResultListItemBlueprintParams } from '@backstage/plugin-search-react/alpha';

// @alpha (undocumented)
const _default: FrontendPlugin<
  {
    entityContent: RouteRef<undefined>;
  },
  {},
  {
    'search-result-list-item:confluence/search-result': ExtensionDefinition<{
      kind: 'search-result-list-item';
      name: 'search-result';
      config: {
        noTrack: boolean;
      };
      configInput: {
        noTrack?: boolean | undefined;
      };
      output: ConfigurableExtensionDataRef<
        {
          predicate?: SearchResultItemExtensionPredicate | undefined;
          component: SearchResultItemExtensionComponent;
        },
        'search.search-result-list-item.item',
        {}
      >;
      inputs: {};
      params: SearchResultListItemBlueprintParams;
    }>;
  }
>;
export default _default;

// (No @packageDocumentation comment for this package)
```
