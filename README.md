# `@orgsoft/jsr`

[![JSR](https://jsr.io/badges/@orgsoft/jsr)](https://jsr.io/@orgsoft/jsr)

A comprehensive TypeScript library, CLI tool, and MCP server for exploring packages on [jsr.io](https://jsr.io). 

JSR is a modern JavaScript repository and alternative to NPM, providing rich TypeScript support, modern features, and seamless integration with Deno.

`@orgsoft/jsr` features semantic search powered by Orama, package download analytics, and an ability to retrieve files and documentation from any package or scope on [jsr](https://jsr.io). This upgrades your development workflows, particularly when using Deno alongside AI coding tools.

## Features

- 📊 **Package Details**: Version info, download trends, and file/docs listing for any JSR packages
- 🔗 **Similarity Search**: Discover related packages to an existing package or search query
- 🖥️ **CLI, MCP, or DIY**: Fully featured command-line interface, MCP server, and exported functions

## Installation

First, ensure the latest version of [Deno](https://deno.com) is installed.

### As an MCP Server

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jsr": {
      "command": "deno",
      "args": [
        "run",
        "--allow-net=jsr.io,api.jsr.io,cloud.orama.run",
        "--allow-run",
        "jsr:@orgsoft/jsr@^1",
        "mcp"
      ]
    }
  }
}
```

> **NOTE:** You may need to replace the path to the `deno` command to the full path to your deno installation for it to work. *(Use `which deno` to find this path)*

### As a Command-Line Utility

You can use the command line utility without needing to install anything except [Deno](https://deno.com).

```sh
# Discover web frameworks on JSR
deno run jsr:@orgsoft/jsr search "web frameworks"

# Find similar projects to this one 
deno run jsr:@orgsoft/jsr similar @orgsoft/jsr

# Same as above, but with permissions granted ahead of time
deno run --allow-net --allow-run jsr:@orgsoft/jsr similar @orgsoft/jsr
```

### CLI installation

You can also install it permanently with `deno install`:

```sh
# Install with default name of "jsr"
deno install -frAg jsr:@orgsoft/jsr # --name [or-some-other-name]

# Get details of @std/http
jsr details @std/http

# Get documentation of @std/http
jsr docs @std/http

# Activate MCP server
jsr mcp
```

### Security notice

Consider using the [minimal permissions necessary](https://docs.deno.com/runtime/fundamentals/security/#permissions) and [specifying pinned version numbers](https://docs.deno.com/runtime/fundamentals/modules/#package-versions) for this package and others, to improve security. You should always review code you execute on your computer and Deno is ideal for this due to its permissions system, open-source programs, & sandboxing model.

Of note is the [`--allow-run` permission](https://docs.deno.com/runtime/fundamentals/security/#subprocesses) included in these installation instructions. It's only necessary for the MCP server's jsr `docs` command, solely for running `deno doc` which is a safe, read-only command. The permission be omitted if the feature is undesired. The MCP server will gracefully handle it by not advertising the docs tool.

## Usage

### Available MCP tools

| Tool | Description | Parameters | Example Usage |
|------|-------------|------------|---------------|
| `search` | Search JSR packages with semantic search | `query`, `limit` (optional) | `search query="web framework" limit=10` |
| `find_similar` | Find packages similar to a specific package | `packageName`, `limit` (optional) | `find_similar packageName="@std/http" limit=6` |
| `discover` | Package discovery by category/use case | `category`, `limit` (optional) | `discover category="web frameworks" limit=8` |
| `compare` | Compare multiple packages side-by-side | `packages` (array) | `compare packages=["@std/testing", "@deno/testing"]` |
| `scope_packages` | Browse all packages in a JSR scope | `scope` | `scope_packages scope="std"` |
| `package_details` | Get detailed package information | `scope`, `packageName` | `package_details scope="std" packageName="http"` |
| `package_downloads` | View download statistics with rolling windows | `scope`, `packageName` | `package_downloads scope="std" packageName="http"` |
| `package_file` | Retrieve package file contents | `scope`, `packageName`, `version`, `filePath` | `package_file scope="std" packageName="http" version="1.0.0" filePath="mod.ts"` |
| `docs` | Get package documentation | `module` | `docs module="@std/path"` |
| `search_status` | Check search capabilities and connection | None | `search_status` |

### MCP parameter reference

| Parameter | Type | Description | Default | Used In |
|-----------|------|-------------|---------|---------|
| `query` | string | Search query (natural language or keywords) | Required | `search` |
| `packageName` | string | Package name with or without scope | Required | `find_similar`, `package_details`, `package_downloads`, `package_file` |
| `category` | string | Use case or technology category | Required | `discover` |
| `packages` | array | Array of package names to compare | Required | `compare` |
| `scope` | string | JSR scope name (e.g., "std", "orgsoft") | Required | `scope_packages`, `package_details`, `package_downloads`, `package_file` |
| `version` | string | Package version (e.g., "1.0.0", "latest") | Required | `package_file` |
| `filePath` | string | Path to file within package | Required | `package_file` |
| `module` | string | Module identifier (e.g., "@std/path") | Required | `docs` |
| `limit` | number | Maximum number of results | 6-20 (varies) | `search`, `find_similar`, `discover` |

### MCP usage examples

```bash
# Search for web frameworks
search query="web framework" limit=10

# Find packages similar to @std/http  
find_similar packageName="@std/http" limit=6

# Discover machine learning libraries
discover category="machine learning" limit=8

# Compare testing frameworks
compare packages=["@std/testing", "@deno/testing", "@fresh/testing"]

# Browse all packages in @std scope
scope_packages scope="std"

# Get detailed package information
package_details scope="std" packageName="http"

# View download statistics with rolling windows
package_downloads scope="std" packageName="http"

# Retrieve a specific file from a package version
package_file scope="std" packageName="http" version="1.0.0" filePath="mod.ts"

# Get package documentation
docs module="@std/path"

# Check search system status
search_status
```

### CLI usage

The package includes a comprehensive command-line interface for all JSR search and analytics features.

#### CLI commands

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| `search` | Search JSR packages with semantic search | `search <query> [--limit=10] [--enhanced]` | `search "web framework" --limit 5` |
| `similar` | Find packages similar to a given package | `similar <package> [--limit=6]` | `similar "@std/http" --limit 3` |
| `details` | Get detailed package information | `details <scope> <package>` | `details std path` |
| `downloads` | View comprehensive download statistics | `downloads <scope> <package>` | `downloads std http` |
| `scope` | List all packages in a JSR scope | `scope <scope-name>` | `scope std` |
| `file` | Retrieve file contents from a package | `file <scope> <package> <version> <file-path>` | `file std http 1.0.0 mod.ts` |
| `exists` | Check if a package exists | `exists <scope> <package>` | `exists std nonexistent` |
| `help` | Show help information | `help [command]` | `help search` |
| `version` | Show CLI version | `version` | `version` |

#### CLI options

| Option | Description | Commands | Example |
|--------|-------------|----------|---------|
| `--limit=N` | Limit number of results | `search`, `similar` | `--limit=5` |
| `--enhanced` | Use enhanced relevance search mode | `search` | `--enhanced` |
| `--help, -h` | Show help information | All | `--help` |

#### CLI examples

```bash
# Search for web frameworks
deno run jsr:@orgsoft/jsr search "web framework" --limit 5

# Find packages similar to @std/http
deno run jsr:@orgsoft/jsr similar @std/http --limit 3

# Get detailed information about a package
deno run jsr:@orgsoft/jsr details @std/path

# View download statistics with rolling windows
deno run jsr:@orgsoft/jsr downloads std http

# List all packages in the @std scope
deno run jsr:@orgsoft/jsr scope std

# Get a specific file from a package version
deno run jsr:@orgsoft/jsr file @std/http 1.0.0 mod.ts

# Check if a package exists
deno run jsr:@orgsoft/jsr exists @std/nonexistent

# Enhanced search with better relevance
deno run jsr:@orgsoft/jsr search "http client" --enhanced --limit 10
```

### TypeScript module usage

#### Basic search

```typescript
import { relevanceSearch } from "jsr:@orgsoft/jsr";

// Basic search
const results = await relevanceSearch("web framework", { limit: 10 });
console.log(results.hits.map(hit => hit.document.name));
```

#### Package information

```typescript
import { getPackageDetails, getPackageDownloadSummary } from "jsr:@orgsoft/jsr";

// Get detailed package info
const packageInfo = await getPackageDetails("std", "http");
console.log(packageInfo);

// Get comprehensive download statistics
const downloads = await getPackageDownloadSummary("std", "http");
console.log(`Total downloads: ${downloads.totalDownloads}`);
console.log(`Weekly average: ${downloads.weeklyAverage}`);
console.log(`Recent weekly totals: ${downloads.weeklySums.join(', ')}`);
```

#### Similar package discovery

```typescript
import { findSimilarPackages } from "jsr:@orgsoft/jsr"

const similar = await findSimilarPackages("@std/http", { limit: 5 });
similar.forEach(pkg => {
  console.log(`${pkg.document.scope}/${pkg.document.name} - Score: ${pkg.score}`);
});
```

## Architecture

### Components

- **Orama Cloud Integration**: Semantic search via Orama's hosted service, used by JSR.io.
- **JSR API Client**: Direct integration with JSR's REST APIs for detailed package information.
- **MCP Protocol Server**: Model Context Protocol server for AI assistants
- **String formatting & aggregation**: Presentational logic

### Files

| File | Purpose | Description |
|------|---------|-------------|
| `mod.ts` | **Main Entry Point** | Primary module that exports all public functions and handles routing between CLI and MCP server modes |
| `cli.ts` | **Command Line Interface** | CLI implementation with commands for package search, discovery, and analytics |
| `mcp.ts` | **MCP Server** | Model Context Protocol server providing tools for AI assistants to interact with JSR |
| `common.ts` | **Core API Library** | Core functions, types, and utilities for JSR API integration and Orama search operations |
| `format.ts` | **Output Formatting** | String formatting and presentation logic for search results, package details, and download statistics |
| `README.md` | **Main Documentation** | Comprehensive usage guide, examples, and API reference |

## API reference

Browse the full TypeScript docs for this package at: [jsr:@orgsoft/jsr/doc](https://jsr.io/@orgsoft/jsr/doc).

## Related links

- [JSR Registry](https://jsr.io)
- [Orama Cloud](https://cloud.orama.run)  
- [MCP Protocol](https://modelcontextprotocol.io)
- [Deno Documentation](https://docs.deno.com/)