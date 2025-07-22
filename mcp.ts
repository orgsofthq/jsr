#!/usr/bin/env deno run --allow-net --allow-run
import { McpServer } from "npm:@modelcontextprotocol/sdk@1.16.0/server/mcp.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk@1.16.0/server/stdio.js";
import { z } from "npm:zod@^3";

import {
  formatDiscoveredPackages,
  formatPackageComparison,
  formatPackageDetails,
  formatPackageDownloads,
  formatScopePackages,
  formatSearchResults,
  formatSimilarPackages
} from "./format.ts";
import {
  findSimilarPackages,
  getErrorMessage,
  getPackageDetails,
  getPackageDocs,
  getPackageDownloadSummary,
  getPackageFile,
  getPackageInfoDirect,
  getScopePackages,
  getSearchCapabilities,
  ORAMA_INDEX_ID,
  queryOrama,
  relevanceSearch
} from "./common.ts";

// Create an MCP server
const server = new McpServer({
  name: "JSR",
  version: "0.0.1",
  description: "JSR search and discovery tools"
});

server.tool("package_docs", {
  module: z.string().describe("The module to document, example @std/path"),
}, async ({ module }) => {
  try {
    const result = await getPackageDocs(module);
    return ({
      content: [{ type: "text", text: result }],
    });
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error getting docs for ${module}: ${getErrorMessage(error)}`
      }],
      isError: true
    };
  }
});

if (Deno.permissions.querySync({ name: "run" }).state === "granted") {
  server.tool("search", {
    query: z.string().describe("Search query for JSR packages"),
    limit: z.number().optional().default(10).describe("Maximum number of results (default: 10)")
  }, async ({ query, limit }) => {
    try {
      const results = await queryOrama(query, { limit });

      // Convert enhanced hits to the format expected by formatSearchResults
      const packages = results.hits?.map((hit: any) => {
        const pkg = hit.document;
        const downloads = hit.downloads;
        
        return {
          id: pkg.id,
          name: pkg.name,
          scope: pkg.scope,
          description: pkg.description,
          score: hit.score,
          runtimeCompat: pkg.runtimeCompat,
          updatedAt: pkg.updatedAt,
          latestVersion: pkg.latestVersion || downloads?.latestVersion || 'Unknown',
          // Include download information from enhanced results
          totalDownloads: downloads?.totalDownloads || 0,
          recentDownloads: downloads?.recentDownloads || 0
        };
      }) || [];

      const summary = formatSearchResults(query, packages);

      return {
        content: [{
          type: "text",
          text: summary
        }],
        meta: {
          searchQuery: query,
          totalResults: packages.length,
          packages: packages
        }
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error searching JSR packages: ${getErrorMessage(error)}`
        }],
        isError: true
      };
    }
  });
}


server.tool("find_similar", {
  packageName: z.string().describe("Name of the JSR package to find similar packages for (e.g., '@std/http', 'netsaur')"),
  limit: z.number().optional().default(6).describe("Maximum number of similar packages (default: 6)")
}, async ({ packageName, limit }) => {
  try {
    const results = await findSimilarPackages(packageName, { limit });

    if (results.error) {
      return {
        content: [{
          type: "text",
          text: `Package "${packageName}" not found in JSR registry.`
        }],
        isError: true
      };
    }

    const originalPkg = results.originalPackage;
    
    // findSimilarPackages already returns enhanced hits with download information
    const similarPackages = results.hits?.map((hit: any) => {
      const pkg = hit.document;
      const downloads = hit.downloads;
      
      return {
        id: pkg.id,
        name: pkg.name,
        scope: pkg.scope,
        description: pkg.description,
        score: hit.score,
        runtimeCompat: pkg.runtimeCompat,
        updatedAt: pkg.updatedAt,
        latestVersion: pkg.latestVersion || downloads?.latestVersion || 'Unknown',
        // Include download information from enhanced results
        totalDownloads: downloads?.totalDownloads || 0,
        recentDownloads: downloads?.recentDownloads || 0
      };
    }) || [];

    const summary = formatSimilarPackages(originalPkg, similarPackages);

    return {
      content: [{
        type: "text",
        text: summary
      }],
      meta: {
        originalPackage: originalPkg,
        similarPackages: similarPackages,
        totalResults: similarPackages.length
      }
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error finding similar packages to "${packageName}": ${getErrorMessage(error)}`
      }],
      isError: true
    };
  }
});

server.tool("discover", {
  category: z.string().describe("Category or use case to discover packages for (e.g., 'web frameworks', 'testing', 'database', 'machine learning')"),
  limit: z.number().optional().default(8).describe("Maximum number of packages to discover (default: 8)")
}, async ({ category, limit }) => {
  try {
    const results = await relevanceSearch(category, { limit });

    // Convert enhanced hits to the format expected by formatDiscoveredPackages
    const packages = results.hits?.map((hit: any) => {
      const pkg = hit.document;
      const downloads = hit.downloads;
      
      return {
        id: pkg.id,
        name: pkg.name,
        scope: pkg.scope,
        description: pkg.description,
        score: hit.score,
        runtimeCompat: pkg.runtimeCompat,
        updatedAt: pkg.updatedAt,
        latestVersion: pkg.latestVersion || downloads?.latestVersion || 'Unknown',
        // Include download information from enhanced results
        totalDownloads: downloads?.totalDownloads || 0,
        recentDownloads: downloads?.recentDownloads || 0
      };
    }) || [];

    // Group packages by scope for better organization
    const packagesByScope = packages.reduce((acc: any, pkg: any) => {
      const scope = pkg.scope || 'unscoped';
      if (!acc[scope]) acc[scope] = [];
      acc[scope].push(pkg);
      return acc;
    }, {});

    const summary = formatDiscoveredPackages(category, packages);

    return {
      content: [{
        type: "text",
        text: summary
      }],
      meta: {
        category: category,
        totalResults: packages.length,
        packages: packages,
        packagesByScope: packagesByScope
      }
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error discovering packages for "${category}": ${getErrorMessage(error)}`
      }],
      isError: true
    };
  }
});

// Package comparison tool
server.tool("compare", {
  packages: z.array(z.string()).describe("Array of package names to compare (e.g., ['@std/http', '@hono/hono'])"),
}, async ({ packages }) => {
  try {
    const packageDetails: any[] = [];

    for (const pkgName of packages) {
      try {
        // Parse package name to extract scope and name
        const match = pkgName.match(/^@?([^/]+)\/(.+)$/);
        if (!match) {
          packageDetails.push({
            id: pkgName,
            found: false,
            error: "Invalid package format. Use @scope/name or scope/name"
          });
          continue;
        }

        const [, scope, name] = match;

        // First try exact lookup using direct JSR API
        try {
          const pkg = await getPackageInfoDirect(scope, name);
          const details = await getPackageDetails(scope, name);
          const downloadSummary = await getPackageDownloadSummary(scope, name);

          packageDetails.push({
            id: `@${scope}/${name}`,
            name: name,
            scope: scope,
            description: details.description,
            runtimeCompat: details.runtimeCompat,
            score: details.score,
            latestVersion: pkg.latest,
            recentDownloads: downloadSummary.recentDownloads,
            totalDownloads: downloadSummary.totalDownloads,
            updatedAt: details.updatedAt,
            versionCount: details.versionCount,
            found: true
          });
        } catch (_directError: unknown) {
          // Fallback to search if direct lookup fails
          const searchResult = await queryOrama(pkgName, {
            limit: 1,
            mode: "fulltext",
            boost: { name: 10, id: 8, scope: 5 }  // Much higher exact match priority
          });

          if (searchResult.hits?.[0]) {
            const pkg = searchResult.hits[0].document;
            packageDetails.push({
              id: pkg.id,
              name: pkg.name,
              scope: pkg.scope,
              description: pkg.description,
              runtimeCompat: pkg.runtimeCompat,
              score: pkg.score,
              found: true,
              fallback: true
            });
          } else {
            packageDetails.push({
              id: pkgName,
              found: false,
              error: "Package not found"
            });
          }
        }
      } catch (error: unknown) {
        packageDetails.push({
          id: pkgName,
          found: false,
          error: getErrorMessage(error),
        });
      }
    }

    const foundPackages = packageDetails.filter(pkg => pkg.found);
    const notFound = packageDetails.filter(pkg => !pkg.found);

    const comparison = formatPackageComparison(foundPackages, notFound);

    return {
      content: [{
        type: "text",
        text: comparison
      }],
      meta: {
        comparedPackages: packages,
        foundPackages: foundPackages,
        notFoundPackages: notFound
      }
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error comparing packages: ${getErrorMessage(error)}`
      }],
      isError: true
    };
  }
});

// Browse packages in a JSR scope
server.tool("scope_packages", {
  scope: z.string().describe("JSR scope name (e.g., 'std', 'orgsoft', 'denosaurs')"),
}, async ({ scope }) => {
  try {
    const scopeName = scope.startsWith("@") ? scope.slice(1) : scope;
    const data = await getScopePackages(scopeName);

    const packages = data.items?.map((pkg) => ({
      name: pkg.name,
      description: pkg.description,
      latestVersion: pkg.latestVersion,
      score: pkg.score,
      versionCount: pkg.versionCount,
      dependencyCount: pkg.dependencyCount,
      dependentCount: pkg.dependentCount,
      runtimeCompat: pkg.runtimeCompat,
      githubRepository: pkg.githubRepository,
      updatedAt: pkg.updatedAt,
      isArchived: pkg.isArchived
    })) || [];

    const summary = formatScopePackages(scopeName, packages);

    return {
      content: [{ type: "text", text: summary }],
      meta: {
        scope: scopeName,
        totalPackages: data.total,
        packages
      }
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error fetching packages for scope '@${scope}': ${getErrorMessage(error)}`
      }],
      isError: true
    };
  }
});

// Get detailed package information
server.tool("package_details", {
  scope: z.string().describe("JSR scope name (e.g., 'std', 'orgsoft')"),
  packageName: z.string().describe("Package name (e.g., 'http', 'dsbuild')")
}, async ({ scope, packageName }) => {
  try {
    const scopeName = scope.startsWith("@") ? scope.slice(1) : scope;
    const pkg = await getPackageDetails(scopeName, packageName);
    const downloadSummary = await getPackageDownloadSummary(scopeName, packageName);
    const meta = await getPackageInfoDirect(scopeName, packageName);

    const details = formatPackageDetails(pkg, downloadSummary, meta);

    return {
      content: [{ type: "text", text: details }],
      meta: {
        package: pkg,
        downloadSummary,
        metadata: meta
      }
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error fetching details for @${scope}/${packageName}: ${getErrorMessage(error)}`
      }],
      isError: true
    };
  }
});

// Get package download statistics
server.tool("package_downloads", {
  scope: z.string().describe("JSR scope name (e.g., 'std', 'orgsoft')"),
  packageName: z.string().describe("Package name (e.g., 'http', 'dsbuild')")
}, async ({ scope, packageName }) => {
  try {
    const scopeName = scope.startsWith("@") ? scope.slice(1) : scope;
    const summary = await getPackageDownloadSummary(scopeName, packageName);

    const report = formatPackageDownloads(scopeName, packageName, summary);

    return {
      content: [{ type: "text", text: report }],
      meta: {
        scope: scopeName,
        packageName,
        summary
      }
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error fetching download stats for @${scope}/${packageName}: ${getErrorMessage(error)}`
      }],
      isError: true
    };
  }
});

server.tool("search_status", {}, async () => {
  try {
    const capabilities = await getSearchCapabilities();
    const timestamp = new Date().toISOString();

    const status = `# 🔧 JSR Search Status

## Connection Status
- **Status**: ✅ Connected to Orama Cloud
- **Timestamp**: ${timestamp}
- **Index ID**: ${ORAMA_INDEX_ID}

## Search Capabilities
- **Fulltext Search**: ✅ Available (Sample: ${capabilities.sample || 'N/A'})

## Available MCP Tools

### Search & Discovery
- \`search\` - Search JSR packages by keywords
- \`find_similar\` - Find packages similar to a specific one
- \`discover\` - Discover packages by category or use case
- \`compare\` - Compare multiple packages side-by-side

### Scope & Package Browsing  
- \`scope_packages\` - Browse all packages in a JSR scope
- \`package_details\` - Get detailed package information with metadata
- \`package_downloads\` - View package download statistics

### Direct Access
- \`package_file\` - Access source code files from packages
- \`package_docs\` - Get package documentation  

### Meta
- \`search_status\` - Check search capabilities (this tool)

## How It Works
This MCP server provides two data sources:
1. **Orama Cloud Search** (${ORAMA_INDEX_ID}) - Fulltext search with relevance scoring
2. **JSR API Direct** (https://api.jsr.io) - Real-time scope/package browsing and download stats

No separate API server required - everything connects directly to external APIs.`;

    return {
      content: [{ type: "text", text: status }],
      meta: {
        timestamp,
        indexId: ORAMA_INDEX_ID,
        capabilities
      }
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error checking search status: ${getErrorMessage(error)}`
      }],
      isError: true
    };
  }
});


server.tool("package_file", {
  scope: z.string().describe("JSR scope name (e.g., 'std', 'hono')"),
  packageName: z.string().describe("Package name (e.g., 'http', 'hono')"),
  version: z.string().describe("Package version (e.g., '1.0.0', 'latest')"),
  filePath: z.string().describe("File path within package (e.g., 'src/index.ts', 'mod.ts')")
}, async ({ scope, packageName, version, filePath }) => {
  try {
    const scopeName = scope.startsWith("@") ? scope.slice(1) : scope;
    // If version is 'latest', get the actual latest version
    let actualVersion: string | undefined = version;
    if (version === 'latest') {
      const meta = await getPackageInfoDirect(scopeName, packageName);
      actualVersion = meta.latest;
    }

    if (!actualVersion) {
      throw new Error("Package version not found");
    }

    const fileContent = await getPackageFile(scopeName, packageName, actualVersion, filePath);

    const response = `# 📄 @${scopeName}/${packageName}@${actualVersion}/${filePath}

\`\`\`typescript
${fileContent}
\`\`\`

**File URL**: https://jsr.io/@${scopeName}/${packageName}/${actualVersion}/${filePath}

💡 **Use \`package_meta\` to see all available versions and files for this package.**`;

    return {
      content: [{ type: "text", text: response }],
      meta: {
        scope: scopeName,
        packageName,
        version: actualVersion,
        filePath,
        fileSize: fileContent.length
      }
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error fetching file @${scope}/${packageName}@${version}/${filePath}: ${getErrorMessage(error)}`
      }],
      isError: true
    };
  }
});

export const main = async () => {
  const transport = new StdioServerTransport();
  console.error("🚀 JSR MCP Server starting...");
  console.error("📦 Tools: search, find_similar, discover, compare, scope_packages, package_details, package_downloads, package_file, package_docs, search_status");
  await server.connect(transport);
}

if (import.meta.main) {
  main();
}