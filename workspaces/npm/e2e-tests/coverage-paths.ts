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

import { join, resolve } from 'node:path';

/**
 * Directory that receives the coverage collected while running the
 * Playwright tests. It is git-ignored and uploaded to Codecov by CI.
 */
export const e2eCoverageDir = resolve(
  __dirname,
  '..',
  'coverage-e2e',
  process.env.APP_MODE ?? 'default',
);

/** Raw V8 coverage from the browser, one file per test. */
export const frontendRawCoverageDir = join(e2eCoverageDir, 'raw', 'frontend');

/** Raw V8 coverage written by the backend process via NODE_V8_COVERAGE. */
export const backendRawCoverageDir = join(e2eCoverageDir, 'raw', 'backend');
