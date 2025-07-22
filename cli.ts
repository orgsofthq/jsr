#!/usr/bin/env deno run --allow-net --allow-run
/**
 * @orgsoft/jsr CLI - Command-line interface for JSR package search and discovery
 * 
 * Provides comprehensive CLI access to all JSR search, analytics, and package management features.
 * 
 * @example
 * ```bash
 * deno run --allow-net cli.ts search "web framework" --limit 5
 * deno run --allow-net cli.ts downloads @std/http
 * deno run --allow-net cli.ts similar "@std/http" --limit 3
 * ```
 */

import { parseArgs } from "jsr:@std/cli@1";
import {
    findSimilarPackages,
    getPackageDetails,
    getPackageDocs,
    getPackageDownloadSummary,
    getPackageFile,
    getScopePackages,
    packageExists,
    queryOrama,
    relevanceSearch,
    type DownloadSummary,
    getPackageInfoDirect
} from "./common.ts";
import {
    formatPackageDetails,
    formatPackageDownloads,
    formatSearchResults,
    formatSimilarPackages,
    formatScopePackages
} from "./format.ts";

const CLI_COMMAND_PREFIX = "deno run -A @orgsoft/jsr"

/**
 * Type guard to check if an error has a message property
 */
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

/**
 * CLI command interface
 */
interface CLICommand {
    name: string;
    description: string;
    usage: string;
    example: string;
    handler: (args: any[], options: Record<string, any>) => Promise<void>;
}

/**
 * Available CLI commands
 */
const commands: Record<string, CLICommand> = {
    search: {
        name: "search",
        description: "Search JSR packages using enhanced semantic search",
        usage: "search <query> [--limit=10] [--enhanced]",
        example: "search 'web framework' --limit 5",
        handler: async (args: string[], options: Record<string, any>) => {
            if (args.length === 0) {
                console.error("Error: Search query is required");
                console.log("Usage: search <query> [--limit=10] [--enhanced]");
                Deno.exit(1);
            }

            const query = args.join(" ");
            const limit = options.limit || 10;
            const enhanced = options.enhanced || false;

            try {
                console.log(`🔍 Searching for "${query}"...`);
                
                const results = enhanced 
                    ? await relevanceSearch(query, { limit })
                    : await queryOrama(query, { limit });

                if (!results.hits || results.hits.length === 0) {
                    console.log("No results found.");
                    return;
                }

                console.log(`\n📦 Found ${results.hits.length} packages:`);
                console.log("─".repeat(60));
                
                // Convert enhanced hits to the format expected by formatSearchResults
                const packages = results.hits.map((hit: any) => {
                    const pkg = hit.document;
                    const downloads = hit.downloads;
                    
                    return {
                        ...pkg,
                        score: hit.score,
                        // Add download information if available
                        totalDownloads: downloads?.totalDownloads || 0,
                        recentDownloads: downloads?.recentDownloads || 0,
                        // Use download summary version info if package info is missing
                        latestVersion: pkg.latestVersion || downloads?.latestVersion || 'Unknown'
                    };
                });
                
                const formattedResults = formatSearchResults(query, packages);
                console.log(formattedResults);
            } catch (error) {
                console.error("Search failed:", getErrorMessage(error));
                Deno.exit(1);
            }
        }
    },

    similar: {
        name: "similar",
        description: "Find packages similar to a given package",
        usage: "similar @<scope>/<package> [--limit=6]",
        example: "similar @orgsoft/jsr --limit 3",
        handler: async (args: string[], options: Record<string, any>) => {
            if (args.length !== 1) {
                console.error("Error: Package name is required");
                console.log("Usage: similar @<scope>/<package> [--limit=6]");
                Deno.exit(1);
            }

            const [scopeAndPackage] = args;
            const [scope, packageName] = scopeAndPackage.split('/', 2)
            const scopeName = scope.startsWith("@") ? scope.slice(1) : scope;
            const limit = options.limit || 6;

            try {
                console.log(`🔗 Finding packages similar to "@${scopeName}/${packageName}"...`);
                
                const results = await findSimilarPackages(scopeName + "/" + packageName, { limit });

                if (!results || results.hits.length === 0) {
                    console.log("No similar packages found.");
                    return;
                }

                // findSimilarPackages already returns enhanced hits with download information
                const formattedResults = formatSimilarPackages(results.originalPackage, results.hits);
                console.log(formattedResults);
            } catch (error) {
                console.error("Similar package search failed:", getErrorMessage(error));
                Deno.exit(1);
            }
        }
    },

    details: {
        name: "details",
        description: "Get detailed information about a package",
        usage: "details @<scope>/<package>",
        example: "details @std/http",
        handler: async (args: string[]) => {
            if (args.length !== 1) {
                console.error("Error: Scope & package name is required");
                console.log("Usage: details @<scope>/<package>");
                Deno.exit(1);
            }

            const [scopeAndPackage] = args;
            const [scope, packageName] = scopeAndPackage.split("/", 2);
            const scopeName = scope.startsWith("@") ? scope.slice(1) : scope;

            try {
                console.log(`📋 Getting details for @${scopeName}/${packageName}...`);
                
                const details = await getPackageDetails(scopeName, packageName);
                const downloadSummary = await getPackageDownloadSummary(scopeName, packageName);
                const meta = await getPackageInfoDirect(scopeName, packageName);

                const formattedDetails = formatPackageDetails(details, downloadSummary, meta);
                console.log(formattedDetails);
            } catch (error) {
                console.error("Failed to get package details:", getErrorMessage(error));
                Deno.exit(1);
            }
        }
    },

    downloads: {
        name: "downloads",
        description: "View comprehensive download statistics with rolling window analysis",
        usage: "downloads @<scope>/<package>",
        example: "downloads @std/http",
        handler: async (args: string[]) => {
            if (args.length != 1) {
                console.error("Error: Both scope and package name are required");
                console.log("Usage: downloads @<scope>/<package>");
                Deno.exit(1);
            }

            const [scopeAndPackage] = args;
            const [scope, packageName] = scopeAndPackage.split("/", 2);
            const scopeName = scope.startsWith("@") ? scope.slice(1) : scope;

            try {
                console.log(`📈 Getting download stats for @${scopeName}/${packageName}...`);
                
                const summary: DownloadSummary = await getPackageDownloadSummary(scopeName, packageName);

                const formattedDownloads = formatPackageDownloads(scopeName, packageName, summary);
                console.log(formattedDownloads);
            } catch (error) {
                console.error("Failed to get download statistics:", getErrorMessage(error));
                Deno.exit(1);
            }
        }
    },

    scope: {
        name: "scope",
        description: "List all packages in a JSR scope",
        usage: "scope @<scope-name>",
        example: "scope @std",
        handler: async (args: string[]) => {
            if (args.length === 0) {
                console.error("Error: Scope name is required");
                console.log("Usage: scope @<scope>");
                Deno.exit(1);
            }

            const scopeName = args[0].startsWith("@") ? args[0].slice(1) : args[0];

            try {
                console.log(`📁 Getting packages in @${scopeName} scope...`);
                
                const packages = await getScopePackages(scopeName);

                if (!packages || packages.items.length === 0) {
                    console.log("No packages found in this scope.");
                    return;
                }

                const formattedScope = formatScopePackages(scopeName, packages.items);
                console.log(formattedScope);
            } catch (error) {
                console.error("Failed to get scope packages:", getErrorMessage(error));
                Deno.exit(1);
            }
        }
    },

    file: {
        name: "file",
        description: "Retrieve contents of a file from a package",
        usage: "file @<scope>/<package> <version> <file-path>",
        example: "file @std/http 1.0.0 mod.ts",
        handler: async (args: string[]) => {
            if (args.length !== 3) {
                console.error("Error: All parameters are required");
                console.log("Usage: file @<scope>/<package> <version> <file-path>");
                Deno.exit(1);
            }

            const [scopeAndPackage, version, filePath] = args;
            const [scope, packageName] = scopeAndPackage.split("/", 2);
            const scopeName = scope.startsWith("@") ? scope.slice(1) : scope;

            try {
                console.warn(`📄 Retrieving ${filePath} from @${scopeName}/${packageName}@${version}...`);
                
                const content = await getPackageFile(scopeName, packageName, version, filePath);

                console.warn(`\n📄 @${scopeName}/${packageName}@${version}/${filePath}`);
                console.warn("─".repeat(60));
                console.log(content);
            } catch (error) {
                console.error("Failed to retrieve file:", getErrorMessage(error));
                Deno.exit(1);
            }
        }
    },

    docs: {
        name: "docs",
        description: "Get documentation for a package",
        usage: "docs @<scope>/<package>",
        example: "docs @std/http",
        handler: async (args: string[]) => {
            if (args.length !== 1) {
                console.error("Error: Package name is required");
                console.log("Usage: docs @<scope>/<package>");
                Deno.exit(1);
            }

            const [module] = args;

            try {
                console.log(`📄 Getting documentation for ${module}...`);
                const docText = await getPackageDocs(module);
                console.log(docText);
            } catch (error) {
                console.error(`Failed to get documentation: ${getErrorMessage(error)}`);
                Deno.exit(1);
            }
        }
    },
    
    exists: {
        name: "exists",
        description: "Check if a package exists",
        usage: "exists \"@<scope>/<package>\"",
        example: "exists @std/http",
        handler: async (args: string[], options: Record<string, any>) => {
            if (args.length < 1) {
                console.error("Error: Scope & package name is required");
                console.log("Usage: exists \"@<scope>/<package>\"");
                Deno.exit(1);
            }

            const [scope, packageName] = args[0].split("/", 2);
            const scopeName = scope.startsWith("@") ? scope.slice(1) : scope;

            try {
                console.log(`🔍 Checking if @${scopeName}/${packageName} exists...`);
                
                const exists = await packageExists(scopeName, packageName);

                if (exists) {
                    console.log(`✅ Package @${scopeName}/${packageName} exists`);
                } else {
                    console.log(`❌ Package @${scopeName}/${packageName} does not exist`);
                    Deno.exit(1);
                }
            } catch (error) {
                console.error("Failed to check package existence:", getErrorMessage(error));
                Deno.exit(1);
            }
        }
    }
};

/**
 * Display help information
 */
function showHelp(commandName?: string) {
    if (commandName && commands[commandName]) {
        const cmd = commands[commandName];
        console.log(`JSR Search CLI - ${cmd.name}`);
        console.log(`\n${cmd.description}`);
        console.log(`\nUsage: ${CLI_COMMAND_PREFIX} ${cmd.name} ${cmd.usage}`);
        console.log(`\nExample: ${CLI_COMMAND_PREFIX} ${cmd.example}`);
        return;
    }

    console.log(`JSR Search CLI - Comprehensive JSR package search and discovery

USAGE:
  ${CLI_COMMAND_PREFIX} <command> [args...] [options...]

MCP:
  mcp${"".padEnd(12)}Start MCP server

COMMANDS:`);

    Object.values(commands).forEach(cmd => {
        console.log(`  ${cmd.name.padEnd(12)} ${cmd.description}`);
    });
    console.log(`
OPTIONS:
  --help, -h     Show help information
  --limit=N      Limit number of results (default varies by command)
  --enhanced     Use enhanced relevance search mode (search command only)

EXAMPLES:
${Object.values(commands).map(cmd => `  ${CLI_COMMAND_PREFIX} ${cmd.example}`).join("\n")}

For more information about a specific command:
  ${CLI_COMMAND_PREFIX} help <command>`);
}

/**
 * Main CLI entry point
 */
export async function main() {
    const parsed = parseArgs(Deno.args, {
        string: ["limit"],
        boolean: ["help", "h", "enhanced", "mcp"],
        alias: { h: "help" },
        "--": true
    });

    const [command, ...args] = parsed._;

    // Show help
    if (parsed.help || command === "help") {
        showHelp(args[0] as string);
        return;
    }

    // Show version
    if (command === "version") {
        console.log("JSR Search CLI v1.0.0");
        return;
    }

    // No command provided
    if (!command) {
        console.error("Error: No command provided");
        showHelp();
        Deno.exit(1);
    }

    // Execute command
    const cmd = commands[command as string];
    if (!cmd) {
        console.error(`Error: Unknown command "${command}"`);
        console.log("Run 'deno run --allow-net cli.ts help' to see available commands");
        Deno.exit(1);
    }

    try {
        await cmd.handler(args as string[], parsed);
    } catch (error) {
        console.error(`Command failed: ${getErrorMessage(error)}`);
        Deno.exit(1);
    }
}

// Run CLI if this file is executed directly
if (import.meta.main) {
    main();
}