import { OramaClient } from "npm:@oramacloud/client@2.1.4";
import denoJson from "./deno.json" with { type: "json" };

// Orama Configuration
export const ORAMA_INDEX_ID = "jsr-j7uqzz";
export const ORAMA_PUBLIC_KEY = "rdpUADH0pFZIEx9xLyLIkPGTP4ypc9Wq";
export const ORAMA_ENDPOINT = `https://cloud.orama.run/v1/indexes/${ORAMA_INDEX_ID}`;

// JSR API configuration
export const JSR_API_BASE = "https://api.jsr.io";
export const JSR_WEB_BASE = "https://jsr.io";

const TOOL_USER_AGENT = `@orgsoft:jsr/${denoJson.version}; https://github.com/orgsofthq/jsr`;

const fetchWrapper = async (url: string): Promise<ReturnType<typeof fetch>> => {
  const response = await fetch(url, {
    headers: {
        // To respect https://jsr.io/docs/api requirements
        "User-Agent": TOOL_USER_AGENT,
        "Accept": "application/json, text/plain"
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response;
};

/**
 * Represents a single hit from an Orama search result.
 */
export interface OramaHit {
  /** The matched document, which is a JSR package */
  document: PackageInfo;
  /** Relevance score for the search result (0-1) */
  score: number;
}

/**
 * Enhanced Orama hit with download and version information
 */
export interface EnhancedOramaHit extends OramaHit {
  /** Download statistics for this package */
  downloads?: DownloadSummary;
}

/**
 * Defines the structure of search results returned from Orama.
 */
export interface OramaSearchResult {
  /** Number of search hits. */
  count: number;
  /** Array of search hits. */
  hits: OramaHit[];
  /** Error message if the search operation failed. */
  error?: string;
}

/**
 * Enhanced search results with download and version information
 */
export interface EnhancedOramaSearchResult {
  /** Number of search hits. */
  count: number;
  /** Array of enhanced search hits with download data. */
  hits: EnhancedOramaHit[];
  /** Error message if the search operation failed. */
  error?: string;
}

/**
 * Options for configuring an Orama search query.
 */
export interface OramaSearchOptions {
  limit?: number;
  offset?: number;
  mode?: "fulltext" | "vector" | "hybrid";
  boost?: Record<string, number>;
  // Add other valid search parameters as needed
}


/**
 * Result structure returned from Orama search operations
 */
export interface SearchResult {
  /** Array of search hits with documents and relevance scores */
  hits?: OramaHit[];
  /** Total number of results found */
  count?: number;
  /** Error message if the search operation failed */
  error?: string;
}

/**
 * Complete package information structure for JSR packages
 */
export interface PackageInfo {
  /** Unique package identifier */
  id: string;
  /** Package name without scope */
  name: string;
  /** Package scope (e.g., "std", "orgsoft") */
  scope: string;
  /** Package description */
  description: string;
  /** Search relevance score when used in search results */
  score?: number;
  /** Runtime compatibility matrix (deno, node, browser, etc.) */
  runtimeCompat?: Record<string, boolean>;
  /** Latest published version string */
  latestVersion?: string;
  /** Total number of published versions */
  versionCount?: number;
  /** Number of dependencies this package has */
  dependencyCount?: number;
  /** Number of packages that depend on this one */
  dependentCount?: number;
  /** GitHub repository information if available */
  githubRepository?: {
    /** Repository owner/organization */
    owner: string;
    /** Repository name */
    name: string;
  };
  /** ISO timestamp of last update */
  updatedAt?: string;
  /** ISO timestamp of package creation */
  createdAt?: string;
  /** Whether the package is archived */
  isArchived?: boolean;
  /** README source */
  readmeSource?: string;
  /** When featured */
  whenFeatured?: string;
  /** Latest version */
  latest?: string;
}

/**
 * Metadata for a specific JSR package version.
 */
export interface JsrPackageVersionMeta {
  yanked?: boolean;
}

/**
 * Top-level metadata for a JSR package from meta.json.
 */
export interface JsrPackageMeta {
  latest: string;
  versions: Record<string, JsrPackageVersionMeta>;
}

/**
 * Represents a single data point in a download timeline.
 */
export interface JsrDownloadPoint {
  timeBucket: string;
  count: number;
}

/**
 * Represents download statistics for a specific package version.
 */
export interface JsrVersionDownloads {
  version: string;
  downloads: JsrDownloadPoint[];
}

/**
 * Structure of the download statistics returned by the JSR API.
 */
export interface JsrDownloads {
  total: JsrDownloadPoint[];
  recentVersions: JsrVersionDownloads[];
}

/**
 * Comprehensive download statistics with rolling window calculations
 */
export interface DownloadSummary {
  /** Total downloads across all versions and time periods */
  totalDownloads: number;
  /** Downloads in the most recent 30 data points */
  recentDownloads: number;
  /** Version string of the latest published version */
  latestVersion: string;
  /** Total downloads for the latest version */
  latestVersionDownloads: number;
  /** Number of data points in the activity timeline */
  activityEntries: number;
  /** ISO timestamp of the most recent download activity */
  lastActivity?: string;
  /** Average downloads per day over the last 7 days */
  last7DaysAverage: number;
  /** Overall weekly average based on total history */
  weeklyAverage: number;
  /** Overall monthly average based on total history */
  monthlyAverage: number;
  /** Download sums for each of the last 4 weeks */
  weeklySums: number[];
  /** Download sums for each of the last 6 months */
  monthlySums: number[];
  /** Error message if download data could not be retrieved */
  error?: string;
}

/**
 * Creates and configures an Orama Cloud client for JSR package search
 * 
 * @returns Configured OramaClient instance ready for search operations
 * @example
 * ```typescript
 * const client = createOramaClient();
 * const results = await client.search({ term: "web framework" });
 * ```
 */
export function createOramaClient(): OramaClient {
    return new OramaClient({
        endpoint: ORAMA_ENDPOINT,
        api_key: ORAMA_PUBLIC_KEY,
    });
}

/**
 * Performs a direct search query against the Orama Cloud JSR package index
 * 
 * @param query - Search query string (natural language or keywords)
 * @param options - Search options including limit, offset, and other parameters
 * @param options.limit - Maximum number of results to return (default: 20)
 * @param options.offset - Number of results to skip (default: 0)
 * @returns Promise resolving to raw Orama search results
 * @throws Error if the search request fails
 * @example
 * ```typescript
 * const results = await queryOrama("web framework", { limit: 10 });
 * console.log(results.hits.map(hit => hit.document.name));
 * ```
 */
export async function queryOrama(
    query: string,
    options: OramaSearchOptions = {},
): Promise<OramaSearchResult> {
    const client = createOramaClient();
    const searchParams = {
        term: query,
        limit: options.limit || 20,
        offset: options.offset || 0,
        boost: {
          id: 3,
          scope: 2,
          name: 1,
          description: 0.5,
        },
        mode: options.mode || "fulltext",
        ...options
    };

    try {
        // @ts-ignore boost property works but not in types when mode is non-fulltext
        const res = await client.search(searchParams);
        
        if (!res) {
            return {
                count: 0,
                hits: [],
                error: "Search failed: received null response"
            };
        }

        return res as OramaSearchResult;
    } catch (error: unknown) {
        // Handle API errors gracefully
        if (error instanceof Error && "httpResponse" in error) {
            const response = (error as { httpResponse: Response }).httpResponse;
            let errorBody = "Unknown error";
            try {
                const text = await response.text();
                errorBody = text || `HTTP ${response.status}: ${response.statusText}`;
            } catch {
                errorBody = `HTTP ${response.status}: ${response.statusText}`;
            }
            
            return {
                count: 0,
                hits: [],
                error: `Orama API error: ${errorBody}`
            };
        }
        
        return {
            count: 0,
            hits: [],
            error: `Search failed: ${getErrorMessage(error)}`
        };
    }
}

/**
 * Performs enhanced fulltext search with optimized field boosting for better relevance
 * 
 * @param query - Search query string
 * @param options - Search options including limit and other parameters
 * @param options.limit - Maximum number of results to return (default: 10)
 * @returns Promise resolving to search results with improved relevance scoring
 * @example
 * ```typescript
 * const results = await relevanceSearch("http client", { limit: 5 });
 * ```
 */
export async function relevanceSearch(
    query: string,
    options: OramaSearchOptions = {},
): Promise<OramaSearchResult> {
    return await queryOrama(query, {
        ...options,
        mode: "fulltext",
        limit: options.limit || 10,
        boost: {
            description: 2.0,
            name: 1.5,
            scope: 0.8,
            id: 0.3
        }
    });
}

/**
 * Finds packages similar to a given package using semantic search with download and version info
 * 
 * @param packageName - Name of the package to find similar packages for (with or without scope)
 * @param options - Search options including limit
 * @param options.limit - Maximum number of similar packages to return (default: 6)
 * @param options.includeDownloads - Whether to fetch download statistics for each package (default: true)
 * @returns Promise resolving to array of similar packages with relevance scores, downloads, and version info
 * @example
 * ```typescript
 * const similar = await findSimilarPackages("@std/http", { limit: 5 });
 * console.log(similar.hits.map(hit => `${hit.document.name} - ${hit.downloads?.totalDownloads} downloads`));
 * ```
 */
export async function findSimilarPackages(
    packageName: string,
    options: OramaSearchOptions & { includeDownloads?: boolean } = {},
): Promise<EnhancedOramaSearchResult & { originalPackage?: PackageInfo }> {
    const includeDownloads = options.includeDownloads !== false; // Default to true
    
    // First get the package details
    const packageResult = await queryOrama(packageName, { 
        limit: 1, 
        boost: { name: 5, scope: 3, id: 2 } 
    });
    
    if (!packageResult?.hits?.length) {
        return { hits: [], count: 0, error: "Package not found" };
    }
    
    const pkg = packageResult.hits[0].document;
    const searchQuery = `${pkg.name} ${pkg.description}`.trim();
    
    // Find similar packages using enhanced fulltext search
    const similarResults = await queryOrama(searchQuery, {
        limit: (options.limit || 10) + 1,
        boost: {
            description: 2.5,
            name: 1.8,
            scope: 1.0,
            id: 0.2
        },
        ...options
    });
    
    // Filter out the original package
    const filtered = similarResults?.hits?.filter(
        (hit: OramaHit) => hit.document.id !== pkg.id
    ) || [];
    
    const limitedResults = filtered.slice(0, options.limit || 10);
    
    // Enhance results with download information if requested
    const enhancedHits: EnhancedOramaHit[] = [];
    
    if (includeDownloads) {
        // Fetch download data for all packages in parallel
        const downloadPromises = limitedResults.map(async (hit): Promise<EnhancedOramaHit> => {
            try {
                const downloads = await getPackageDownloadSummary(hit.document.scope, hit.document.name);
                return {
                    ...hit,
                    downloads: downloads.error ? undefined : downloads
                };
            } catch (_error: unknown) {
                // If download fetch fails, return hit without download data
                return { ...hit };
            }
        });
        
        const results = await Promise.all(downloadPromises);
        enhancedHits.push(...results);
    } else {
        // If downloads not requested, just convert to enhanced format
        enhancedHits.push(...limitedResults.map(hit => ({ ...hit })));
    }

    return {
        hits: enhancedHits,
        count: enhancedHits.length,
        originalPackage: pkg
    };
}

/**
 * Get error message from an error
 * 
 * @param error - The error to get the message from
 * @returns The error message
 */
export function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Test search capabilities
 * 
 * @returns Promise resolving to search capabilities
 */
export async function getSearchCapabilities(): Promise<{
    query: string;
    success: boolean;
    count: number;
    sample: string | null;
    mode: string;
}> {
    const testQuery = "http";
    const result = await queryOrama(testQuery, { limit: 2 });
    
    return {
        query: testQuery,
        success: true,
        count: result.hits?.length || 0,
        sample: result.hits?.[0]?.document?.name || null,
        mode: "fulltext"
    };
}

/**
 * Fetch data from the JSR API
 * 
 * @param endpoint - The API endpoint to fetch from
 * @returns Promise resolving to the fetched data
 */
export async function fetchJSRAPI<T>(endpoint: string): Promise<T> {
    const response = await fetchWrapper(`${JSR_API_BASE}${endpoint}`);
    if (!response.ok) {
        throw new Error(`JSR API error: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
}

/**
 * Fetch data from the JSR.io direct API
 * 
 * @param endpoint - The API endpoint to fetch from
 * @returns Promise resolving to the fetched data
 */
export async function fetchJSRDirect<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${JSR_WEB_BASE}${endpoint}`);
    if (!response.ok) {
        throw new Error(`JSR direct error: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
}

/**
 * Get exact package info from JSR.io direct API
 * 
 * @param scope - The JSR scope name
 * @param packageName - The package name within the scope
 * @returns Promise resolving to the package info
 */
export async function getPackageInfoDirect(scope: string, packageName: string): Promise<PackageInfo> {
    try {
        return await fetchJSRDirect(`/@${scope}/${packageName}/meta.json`);
    } catch (_error: unknown) {
        // Fallback to old API method
        return await getPackageDetails(scope, packageName);
    }
}

/**
 * Get package file contents
 * 
 * @param scope - The JSR scope name
 * @param packageName - The package name within the scope
 * @param version - The package version
 * @param filePath - The path to the file within the package
 * @returns Promise resolving to the file contents as a string
 */
export async function getPackageFile(scope: string, packageName: string, version: string, filePath: string): Promise<string> {
    const response = await fetchWrapper(`${JSR_WEB_BASE}/@${scope}/${packageName}/${version}/${filePath}`);
    if (!response.ok) {
        throw new Error(`File not found: ${response.status} ${response.statusText}`);
    }
    return response.text();
}

/**
 * Check if package exists with exact matching
 * 
 * @param scope - The JSR scope name
 * @param packageName - The package name within the scope
 * @returns Promise resolving to boolean indicating if the package exists
 */
export async function packageExists(scope: string, packageName: string): Promise<boolean> {
    try {
        const response = await fetchWrapper(`${JSR_WEB_BASE}/@${scope}/${packageName}/meta.json`);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Retrieves all packages within a JSR scope
 * 
 * @param scope - The JSR scope name (e.g., "std", "orgsoft")
 * @returns Promise resolving to array of packages in the scope
 * @example
 * ```typescript
 * const stdPackages = await getScopePackages("std");
 * ```
 */
export function getScopePackages(scope: string): Promise<{
    items: PackageInfo[];
    total: number;
}> {
    return fetchJSRAPI(`/scopes/${scope}/packages`);
}

/**
 * Retrieves detailed information about a specific JSR package
 * 
 * @param scope - The JSR scope name
 * @param packageName - The package name within the scope
 * @returns Promise resolving to package details including versions, metadata, etc.
 * @example
 * ```typescript
 * const packageInfo = await getPackageDetails("std", "http");
 * ```
 */
export function getPackageDetails(scope: string, packageName: string): Promise<PackageInfo> {
    return fetchJSRAPI(`/scopes/${scope}/packages/${packageName}`);
}

/**
 * Retrieves raw download statistics for a JSR package
 * 
 * @param scope - The JSR scope name
 * @param packageName - The package name within the scope  
 * @returns Promise resolving to raw download data with timeline and version breakdowns
 * @example
 * ```typescript
 * const downloads = await getPackageDownloads("std", "http");
 * ```
 */
export function getPackageDownloads(scope: string, packageName: string): Promise<JsrDownloads> {
    return fetchJSRAPI(`/scopes/${scope}/packages/${packageName}/downloads`);
}

/**
 * Retrieves documentation for a JSR package using `deno doc`.
 *
 * @param module - The full JSR module name (e.g., "@std/path").
 * @returns A promise that resolves to the documentation text.
 * @throws An error if the `deno doc` command fails.
 */
export async function getPackageDocs(module: string): Promise<string> {
  const command = new Deno.Command(Deno.execPath(), {
    args: ["doc", "jsr:" + module],
    env: { NO_COLOR: "1" },
  });
  const { stdout, stderr, success } = await command.output();

  if (!success) {
    const errorText = new TextDecoder().decode(stderr);
    throw new Error(`Failed to get docs for ${module}: ${errorText}`);
  }

  return new TextDecoder().decode(stdout);
}


/**
 * Calculates comprehensive download statistics with rolling window averages
 * 
 * Processes raw download data to provide meaningful metrics including:
 * - Total and recent download counts
 * - Rolling averages for different time windows
 * - Weekly and monthly trend data
 * 
 * @param scope - The JSR scope name
 * @param packageName - The package name within the scope
 * @returns Promise resolving to processed download summary with averages and trends
 * @example
 * ```typescript
 * const summary = await getPackageDownloadSummary("std", "http");
 * console.log(`Total downloads: ${summary.totalDownloads}`);
 * console.log(`Weekly average: ${summary.weeklyAverage}`);
 * console.log(`Recent weekly totals: ${summary.weeklySums.join(', ')}`);
 * ```
 */
export async function getPackageDownloadSummary(scope: string, packageName: string): Promise<DownloadSummary> {
    try {
        const downloads = await getPackageDownloads(scope, packageName);
        
        // Calculate total downloads
        const totalDownloads = downloads.total?.reduce((sum: number, entry: JsrDownloadPoint) => sum + entry.count, 0) || 0;
        
        // Get recent activity (last 30 entries)
        const recentActivity = downloads.total?.slice(-30) || [];
        const recentDownloads = recentActivity.reduce((sum: number, entry: JsrDownloadPoint) => sum + entry.count, 0);
        
        // Calculate rolling window averages and sums
        const totalData = downloads.total || [];
        
        // Last 7 days average
        const last7Days = totalData.slice(-7);
        const last7DaysTotal = last7Days.reduce((sum: number, entry: JsrDownloadPoint) => sum + entry.count, 0);
        const last7DaysAverage = last7Days.length > 0 ? Math.round(last7DaysTotal / last7Days.length) : 0;
        
        // Overall averages
        const totalEntries = totalData.length || 0;
        const dailyAverage = totalEntries > 0 ? Math.round(totalDownloads / totalEntries) : 0;
        const weeklyAverage = Math.round(dailyAverage * 7);
        const monthlyAverage = Math.round(dailyAverage * 30);
        
        // Weekly sums for last 4 weeks (7-day windows)
        const weeklySums: number[] = [];
        for (let i = 0; i < 4; i++) {
            const weekStart = totalData.length - 7 - (i * 7);
            const weekEnd = totalData.length - (i * 7);
            if (weekStart >= 0) {
                const weekData = totalData.slice(Math.max(0, weekStart), weekEnd);
                const weekTotal = weekData.reduce((sum: number, entry: JsrDownloadPoint) => sum + entry.count, 0);
                weeklySums.unshift(weekTotal);
            }
        }
        
        // Monthly sums for last 6 months (30-day windows)
        const monthlySums: number[] = [];
        for (let i = 0; i < 6; i++) {
            const monthStart = totalData.length - 30 - (i * 30);
            const monthEnd = totalData.length - (i * 30);
            if (monthStart >= 0) {
                const monthData = totalData.slice(Math.max(0, monthStart), monthEnd);
                const monthTotal = monthData.reduce((sum: number, entry: JsrDownloadPoint) => sum + entry.count, 0);
                monthlySums.unshift(monthTotal);
            }
        }
        
        // Get latest version downloads
        const latestVersion = downloads.recentVersions?.[0];
        const latestVersionDownloads = latestVersion?.downloads?.reduce((sum: number, entry: JsrDownloadPoint) => sum + entry.count, 0) || 0;
        
        return {
            totalDownloads,
            recentDownloads,
            latestVersion: latestVersion?.version || 'Unknown',
            latestVersionDownloads,
            activityEntries: recentActivity.length,
            lastActivity: recentActivity[recentActivity.length - 1]?.timeBucket || undefined,
            last7DaysAverage,
            weeklyAverage,
            monthlyAverage,
            weeklySums,
            monthlySums
        };
    } catch (_error: unknown) {
        return {
            error: getErrorMessage(_error),
            totalDownloads: 0,
            recentDownloads: 0,
            latestVersion: 'Unknown',
            latestVersionDownloads: 0,
            activityEntries: 0,
            last7DaysAverage: 0,
            weeklyAverage: 0,
            monthlyAverage: 0,
            weeklySums: [],
            monthlySums: []
        };
    }
}