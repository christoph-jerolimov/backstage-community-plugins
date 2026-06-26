/*
 * Copyright 2025 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import useAsync from 'react-use/esm/useAsync';

import {
  InfoCard,
  Link,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import {
  MissingAnnotationEmptyState,
  useEntity,
} from '@backstage/plugin-catalog-react';
import { stringifyEntityRef } from '@backstage/catalog-model';

import Box from '@material-ui/core/Box';
import Grid, { GridSize } from '@material-ui/core/Grid';
import LinearProgress from '@material-ui/core/LinearProgress';
import Typography from '@material-ui/core/Typography';
import { Theme, makeStyles } from '@material-ui/core/styles';

import { codecovApiRef } from '../../api';
import { CODECOV_REPO_ANNOTATION, isCodecovAvailable } from '../../annotations';
import { CodecovTotals } from '../../types';

function coverageColor(theme: Theme, coverage: number): string {
  if (coverage >= 80) {
    return theme.palette.success.main;
  }
  if (coverage >= 60) {
    return theme.palette.warning.main;
  }
  return theme.palette.error.main;
}

const useStyles = makeStyles<Theme, { coverage: number }>(theme => ({
  percentage: {
    fontWeight: 'bold',
    color: ({ coverage }) => coverageColor(theme, coverage),
  },
  bar: {
    height: 10,
    borderRadius: 5,
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  barColor: {
    backgroundColor: ({ coverage }) => coverageColor(theme, coverage),
  },
  label: {
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
    fontSize: '10px',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  value: {
    fontWeight: 'bold',
    lineHeight: '24px',
  },
}));

function Stat({
  label,
  value,
  xs = 6,
}: {
  label: string;
  value: React.ReactNode;
  xs?: boolean | GridSize;
}) {
  const classes = useStyles({ coverage: 0 });
  return (
    <Grid item xs={xs}>
      <Typography className={classes.label}>{label}</Typography>
      <Typography variant="body2" className={classes.value}>
        {value}
      </Typography>
    </Grid>
  );
}

function CoverageContent({
  totals,
  branch,
}: {
  totals: CodecovTotals;
  branch?: string;
}) {
  const coverage = Math.round(totals.coverage * 100) / 100;
  const classes = useStyles({ coverage });

  return (
    <>
      <Box display="flex" alignItems="baseline">
        <Typography variant="h3" className={classes.percentage}>
          {coverage}%
        </Typography>
        <Box ml={1}>
          <Typography variant="body2" color="textSecondary">
            line coverage{branch ? ` on ${branch}` : ''}
          </Typography>
        </Box>
      </Box>

      <LinearProgress
        variant="determinate"
        value={Math.min(100, Math.max(0, coverage))}
        classes={{ root: classes.bar, bar: classes.barColor }}
      />

      <Grid container spacing={2}>
        <Stat label="Lines" value={totals.lines.toLocaleString()} />
        <Stat label="Files" value={totals.files.toLocaleString()} />
        <Stat label="Hits" value={totals.hits.toLocaleString()} />
        <Stat label="Misses" value={totals.misses.toLocaleString()} />
        <Stat label="Partials" value={totals.partials.toLocaleString()} />
        {typeof totals.branches === 'number' && (
          <Stat label="Branch coverage" value={`${totals.branches}%`} />
        )}
      </Grid>
    </>
  );
}

/**
 * Catalog card that shows common code coverage information for an entity,
 * sourced from Codecov via the `codecov` backend plugin.
 *
 * @public
 */
export const EntityCodecovCard = () => {
  const { entity } = useEntity();
  const codecovApi = useApi(codecovApiRef);
  const entityRef = stringifyEntityRef(entity);

  const available = isCodecovAvailable(entity);

  const {
    value: coverage,
    loading,
    error,
  } = useAsync(async () => {
    if (!available) {
      return undefined;
    }
    return codecovApi.getCoverage(entityRef);
  }, [entityRef, available]);

  if (!available) {
    return (
      <MissingAnnotationEmptyState
        annotation={CODECOV_REPO_ANNOTATION}
        readMoreUrl="https://backstage.io/docs/features/software-catalog/descriptor-format"
      />
    );
  }

  const deepLink = coverage
    ? { title: 'View on Codecov', link: coverage.webUrl }
    : undefined;

  return (
    <InfoCard title="Code Coverage" deepLink={deepLink}>
      {loading && <Progress />}

      {error && !loading && <ResponseErrorPanel error={error} />}

      {!loading && !error && coverage && (
        <>
          {coverage.totals ? (
            <CoverageContent
              totals={coverage.totals}
              branch={coverage.branch}
            />
          ) : (
            <Typography variant="body2" color="textSecondary">
              No coverage has been uploaded for{' '}
              <Link to={coverage.webUrl}>
                {coverage.owner}/{coverage.repo}
              </Link>{' '}
              yet.
            </Typography>
          )}
        </>
      )}
    </InfoCard>
  );
};
