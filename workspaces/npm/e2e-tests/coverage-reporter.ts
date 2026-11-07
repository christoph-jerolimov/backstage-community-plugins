/*
 * Copyright 2026 The Backstage Authors
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

import type { Reporter } from '@playwright/test/reporter';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { CoverageReport } from 'monocart-coverage-reports';

import {
  backendRawCoverageDir,
  e2eCoverageDir,
  frontendRawCoverageDir,
} from './coverage-paths';

const workspaceDir = resolve(__dirname, '..');
const repoRelativeWorkspaceDir = `workspaces/${basename(workspaceDir)}/`;

/**
 * Paths arrive as `file:///...` URLs, absolute paths or paths relative to the
 * workspace (the current directory). Codecov expects them relative to the
 * repository root.
 */
function toRepoPath(path: string): string {
  const index = path.indexOf(repoRelativeWorkspaceDir);
  if (index >= 0) {
    return path.slice(index);
  }
  if (path.startsWith('/') || path.startsWith('file:')) {
    return path;
  }
  return `${repoRelativeWorkspaceDir}${path}`;
}

function isPluginSource(path: string): boolean {
  return (
    /^workspaces\/[^/]+\/plugins\/[^/]+\/src\//.test(path) &&
    !/\.test\.|setupTests|node_modules/.test(path)
  );
}

/**
 * Playwright reporter that converts the raw V8 coverage of the browser (see
 * `coverage.ts`) and of the backend (see `NODE_V8_COVERAGE` in the Playwright
 * config) into `coverage-e2e/<mode>/lcov.info`, mapped back to the plugin
 * sources. Files that were never loaded are reported with zero coverage.
 */
class CoverageReporter implements Reporter {
  printsToStdio() {
    return false;
  }

  // onExit runs after the web servers were stopped, so that the backend has
  // flushed its coverage data by now.
  async onExit() {
    const pluginSourceDirs = readdirSync(join(workspaceDir, 'plugins'), {
      withFileTypes: true,
    })
      .filter(entry => entry.isDirectory())
      .map(entry => join(workspaceDir, 'plugins', entry.name, 'src'))
      .filter(dir => existsSync(dir));

    const report = new CoverageReport({
      name: 'Playwright e2e coverage',
      outputDir: e2eCoverageDir,
      cleanCache: true,
      reports: [['lcovonly'], ['console-summary']],
      entryFilter: entry =>
        (entry.url ?? '').startsWith('webpack-internal:') ||
        (entry.url ?? '').includes(`${workspaceDir}/plugins/`),
      sourceFilter: path => isPluginSource(toRepoPath(path)),
      sourcePath: path => toRepoPath(path),
      all: {
        dir: pluginSourceDirs,
        filter: path =>
          isPluginSource(toRepoPath(path)) && /\.tsx?$/.test(path)
            ? 'js'
            : false,
      },
    });

    if (existsSync(frontendRawCoverageDir)) {
      for (const file of readdirSync(frontendRawCoverageDir)) {
        const entries = JSON.parse(
          readFileSync(join(frontendRawCoverageDir, file), 'utf8'),
        );
        await report.add(entries);
      }
    }
    if (existsSync(backendRawCoverageDir)) {
      await report.addFromDir(backendRawCoverageDir);
    }

    await report.generate();
    rmSync(join(e2eCoverageDir, 'raw'), { recursive: true, force: true });
    // eslint-disable-next-line no-console
    console.log(`Playwright coverage written to ${e2eCoverageDir}/lcov.info`);
  }
}

export default CoverageReporter;
