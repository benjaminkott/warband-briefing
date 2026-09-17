/**
 * The repository of the app on GitHub: where the releases are that the
 * updater reads, and where the season catalog is fetched from.
 */

export const GITHUB_REPO = 'benjaminkott/warband-briefing'

/** Where the repository keeps the catalog; the same file the build ships. */
export const CATALOG_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/src/shared/data/seasonCatalog.json`
