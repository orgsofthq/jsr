#!/usr/bin/env deno run --allow-net --allow-run
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
    queryOrama,
    relevanceSearch
} from "./common.ts";

import { main as cliMain } from "./cli.ts";
import { main as mcpMain } from "./mcp.ts";

export {
    findSimilarPackages,
    getErrorMessage,
    getPackageDetails,
    getPackageDocs,
    getPackageDownloadSummary,
    getPackageFile,
    getPackageInfoDirect,
    getScopePackages,
    getSearchCapabilities,
    queryOrama,
    relevanceSearch
};

if (import.meta.main) {
    if (Deno.args.length > 0 && Deno.args[0] === "mcp") {
        mcpMain();
    } else {
        cliMain();
    }
}