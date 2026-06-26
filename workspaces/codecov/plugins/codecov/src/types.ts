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

/**
 * Aggregated coverage totals as reported by Codecov.
 *
 * @public
 */
export interface CodecovTotals {
  /** Number of tracked files. */
  files: number;
  /** Number of tracked lines. */
  lines: number;
  /** Number of covered lines. */
  hits: number;
  /** Number of uncovered lines. */
  misses: number;
  /** Number of partially covered lines. */
  partials: number;
  /** Overall line coverage in percent (0 - 100). */
  coverage: number;
  /** Branch coverage in percent, when available. */
  branches?: number;
  /** Method coverage in percent, when available. */
  methods?: number;
}

/**
 * Normalized code coverage information for a single repository, as returned by
 * the `codecov` backend plugin.
 *
 * @public
 */
export interface CodecovCoverage {
  /** Source control provider, e.g. `github`. */
  service: string;
  /** Repository owner (user or organization). */
  owner: string;
  /** Repository name. */
  repo: string;
  /** Default branch the totals are reported for, when available. */
  branch?: string;
  /** Primary language of the repository, when available. */
  language?: string;
  /** Whether the repository is private. */
  private?: boolean;
  /** Link to the repository overview on Codecov. */
  webUrl: string;
  /** Aggregated coverage totals, or `null` when none are available yet. */
  totals: CodecovTotals | null;
}
