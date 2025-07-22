
export function formatSearchResults(query: string, packages: any[]): string {
  if (!packages || packages.length === 0) {
    return "No packages found.";
  }

  const packageLines = packages.map((pkg: any, i: number) => {
    const scoreText = pkg.score ? ` (Score: ${pkg.score.toFixed(2)})` : '';
    const versionText = pkg.latestVersion ? `v${pkg.latestVersion}` : 'Unknown version';
    const updatedText = pkg.updatedAt ? ` | Updated: ${new Date(pkg.updatedAt).toLocaleDateString()}` : '';
    const downloadText = pkg.totalDownloads ? ` | Downloads: ${pkg.totalDownloads.toLocaleString()}` : '';

    const runtimes = pkg.runtimeCompat
      ? Object.entries(pkg.runtimeCompat)
          .filter(([_, supported]) => supported)
          .map(([runtime]) => runtime)
          .join(", ")
      : "Unknown";

    return `${i + 1}. **${pkg.id}**${scoreText}
     ${pkg.description}
     **Version**: ${versionText}${downloadText}${updatedText}
     **Compatible**: ${runtimes || "Unknown"}`;
  });

  return `Found ${packages.length} JSR packages matching "${query}":\n\n${packageLines.join("\n\n")}`;
}

export function formatSimilarPackages(originalPkg: any, similarPackages: any[]): string {
  if (!similarPackages || similarPackages.length === 0) {
    return `No similar packages found for **${originalPkg?.id}**.`;
  }

  const packageLines = similarPackages.map((hit: any, i: number) => {
    // Handle both old format (direct package properties) and new enhanced format (hit.document + hit.downloads)
    const pkg = hit.document || hit;
    const downloads = hit.downloads;
    
    const similarityText = hit.score ? ` (Similarity: ${hit.score.toFixed(2)})` : '';
    // Use comprehensive version fallbacks like other formatters
    const latestVersion = pkg.latestVersion || downloads?.latestVersion || 'Unknown';
    const versionText = latestVersion !== 'Unknown' ? `v${latestVersion}` : 'Unknown version';
    const updatedText = pkg.updatedAt ? ` | Updated: ${new Date(pkg.updatedAt).toLocaleDateString()}` : '';
    
    // Use enhanced download data if available, fallback to old format
    let downloadText = '';
    if (downloads && !downloads.error) {
      downloadText = ` | Downloads: ${downloads.totalDownloads.toLocaleString()}`;
      if (downloads.recentDownloads > 0) {
        downloadText += ` (${downloads.recentDownloads.toLocaleString()} recent)`;
      }
    } else if (pkg.totalDownloads) {
      downloadText = ` | Downloads: ${pkg.totalDownloads.toLocaleString()}`;
    }

    const runtimes = pkg.runtimeCompat
      ? Object.entries(pkg.runtimeCompat)
          .filter(([_, supported]) => supported)
          .map(([runtime]) => runtime)
          .join(", ")
      : "Unknown";

    return `${i + 1}. **${pkg.id}**${similarityText}
     ${pkg.description}
     **Version**: ${versionText}${downloadText}${updatedText}
     **Runtime support**: ${runtimes || "Unknown"}`;
  });

  return `## Original Package
**${originalPkg?.id}**
${originalPkg?.description}

## ${similarPackages.length} Similar Packages:

${packageLines.join("\n\n")}`
}

export function formatDiscoveredPackages(category: string, packages: any[]): string {
  const packagesByScope = packages.reduce((acc: any, pkg: any) => {
    const scope = pkg.scope || 'unscoped';
    if (!acc[scope]) acc[scope] = [];
    acc[scope].push(pkg);
    return acc;
  }, {});

  const scopeSections = Object.entries(packagesByScope).map(([scope, scopePkgs]: [string, any]) => {
    if (scope === 'unscoped') return '';
    return `## @${scope} packages:
${(scopePkgs as any[]).map((pkg: any) => {
  const scoreText = pkg.score ? ` (${pkg.score.toFixed(2)})` : '';
  const versionText = pkg.latestVersion || 'Unknown';
  const downloadText = pkg.totalDownloads ? ` | Downloads: ${pkg.totalDownloads.toLocaleString()}` : '';
  const updatedText = pkg.updatedAt ? ` | Updated: ${new Date(pkg.updatedAt).toLocaleDateString()}` : '';
  const runtimes = Object.entries(pkg.runtimeCompat || {})
    .filter(([_, supported]) => supported)
    .map(([runtime]) => runtime)
    .join(", ") || "Unknown";

  return `- **${pkg.name}**${scoreText}
    ${pkg.description}
    **Version**: ${versionText}${downloadText}${updatedText}
    **Runtimes**: ${runtimes}`;
}).join("\n")}`;
  }).filter(Boolean).join("\n\n");

  const unscopedSection = packagesByScope.unscoped ? `## Other packages:
${packagesByScope.unscoped.map((pkg: any) => {
  const scoreText = pkg.score ? ` (${pkg.score.toFixed(2)})` : '';
  const versionText = pkg.latestVersion || 'Unknown';
  const downloadText = pkg.totalDownloads ? ` | Downloads: ${pkg.totalDownloads.toLocaleString()}` : '';
  const updatedText = pkg.updatedAt ? ` | Updated: ${new Date(pkg.updatedAt).toLocaleDateString()}` : '';

  return `- **${pkg.id}**${scoreText}
    ${pkg.description}
    **Version**: ${versionText}${downloadText}${updatedText}`;
}).join("\n")}` : '';

  return `# 🔍 JSR Package Discovery: ${category}

Found ${packages.length} relevant packages:

${scopeSections}

${unscopedSection}

💡 **Next Steps**: Use \`package_docs\` to get detailed documentation for any package, or \`find_similar\` to discover related packages.`;
}

export function formatPackageComparison(foundPackages: any[], notFoundPackages: any[]): string {
  const foundSection = `## Packages Found (${foundPackages.length}):

${foundPackages.map((pkg: any, i: number) =>
  `### ${i + 1}. ${pkg.id}
**Description**: ${pkg.description}
**Latest Version**: ${pkg.latestVersion || 'Unknown'} | **Quality Score**: ${pkg.score}/100
**Downloads**: ${(pkg.totalDownloads || 0).toLocaleString()} total, ${(pkg.recentDownloads || 0).toLocaleString()} recent
**Versions**: ${pkg.versionCount || 'Unknown'} published | **Last Updated**: ${pkg.updatedAt ? new Date(pkg.updatedAt).toLocaleDateString() : 'Unknown'}
**Runtime Compatibility**:
${Object.entries(pkg.runtimeCompat || {}).map(([runtime, supported]) =>
  `  - ${runtime}: ${supported ? '✅' : '❌'}`
).join('\n')}
`
).join('\n')}`;

  const notFoundSection = notFoundPackages.length > 0
    ? `\n## ⚠️ Packages Not Found (${notFoundPackages.length}):\n${notFoundPackages.map(pkg => `- ${pkg.id}`).join('\n')}`
    : '';

  const compatibilityMatrix = foundPackages.length > 1
    ? `\n## 🔀 Runtime Compatibility Matrix:

| Package | Deno | Node | Bun | Browser | Workerd |
|---|---|---|---|---|---|
${foundPackages.map(pkg =>
  `| ${pkg.name} | ${['deno', 'node', 'bun', 'browser', 'workerd'].map(runtime =>
    pkg.runtimeCompat?.[runtime] ? '✅' : '❌'
  ).join(' | ')} |`
).join('\n')}`
    : '';

  return `# 📊 JSR Package Comparison

${foundSection}${notFoundSection}${compatibilityMatrix}`;
}

export function formatScopePackages(scope: string, packages: any[]): string {
  const packageLines = packages.map((pkg: any, i: number) => {
    const runtimes = Object.entries(pkg.runtimeCompat || {})
      .filter(([_, supported]) => supported)
      .map(([runtime]) => runtime)
      .join(", ") || "Unknown";

    const github = pkg.githubRepository
      ? `[${pkg.githubRepository.owner}/${pkg.githubRepository.name}](https://github.com/${pkg.githubRepository.owner}/${pkg.githubRepository.name})`
      : "No GitHub";

    return `## ${i + 1}. @${scope}/${pkg.name} v${pkg.latestVersion}
**Description**: ${pkg.description}
**Quality Score**: ${pkg.score}/100 | **Versions**: ${pkg.versionCount} | **Dependencies**: ${pkg.dependencyCount} | **Dependents**: ${pkg.dependentCount}
**Runtime Support**: ${runtimes}
**GitHub**: ${github}
**Status**: ${pkg.isArchived ? '🗄️ Archived' : '✅ Active'} | **Updated**: ${new Date(pkg.updatedAt).toLocaleDateString()}`;
  }).join("\n\n");

  return `# 📦 @${scope} Scope - ${packages.length} packages

${packageLines}

💡 **Use \`package_details\` to get more info about a specific package, or \`package_downloads\` for download statistics.**`;
}

export function formatPackageDetails(pkg: any, downloadSummary: any, meta: any): string {
  const scopeName = pkg.scope;
  const packageName = pkg.name;

  const runtimes = Object.entries(pkg.runtimeCompat || {})
    .map(([runtime, supported]) => `${runtime}: ${supported ? '✅' : '❌'}`)
    .join(", ");

  const github = pkg.githubRepository
    ? `[${pkg.githubRepository.owner}/${pkg.githubRepository.name}](https://github.com/${pkg.githubRepository.owner}/${pkg.githubRepository.name})`
    : "No GitHub repository";

  const availableVersions = meta.versions ? Object.keys(meta.versions).slice(0, 10) : [];
  const versionList = availableVersions.length > 0
    ? availableVersions.join(", ") + (Object.keys(meta.versions || {}).length > 10 ? " ..." : "")
    : "No version info available";

  return `# 📦 @${scopeName}/${packageName}

## Overview
**Description**: ${pkg.description}
**Latest Version**: v${meta.latest || pkg.latestVersion}
**Quality Score**: ${pkg.score}/100

## Versions & Downloads
- **Versions Published**: ${pkg.versionCount} | **Available**: ${versionList}
- **Total Downloads**: ${downloadSummary.totalDownloads.toLocaleString()}
- **Recent Downloads** (last 30 days): ${downloadSummary.recentDownloads.toLocaleString()}
- **Latest Version Downloads**: ${downloadSummary.latestVersionDownloads.toLocaleString()}

## Dependencies & Usage
- **Dependencies**: ${pkg.dependencyCount}
- **Dependents**: ${pkg.dependentCount}
- **JSR Import**: \`import { ... } from "jsr:@${scopeName}/${packageName}@${meta.latest}"\`

## Runtime Compatibility
${runtimes}

## Repository & Links
${github}
- **JSR Page**: https://jsr.io/@${scopeName}/${packageName}
- **Meta API**: https://jsr.io/@${scopeName}/${packageName}/meta.json

## Metadata
- **Created**: ${new Date(pkg.createdAt || "").toLocaleDateString()}
- **Updated**: ${new Date(pkg.updatedAt || "").toLocaleDateString()}
- **Status**: ${pkg.isArchived ? '🗄️ Archived' : '✅ Active'}
- **README Source**: ${pkg.readmeSource || "Unknown"}
${pkg.whenFeatured ? `- **Featured**: ${new Date(pkg.whenFeatured || "").toLocaleDateString()}` : ''}

💡 **Use \`package_file\` to view source files, \`find_similar\` to find alternatives, or \`package_docs\` for API documentation.**`;
}

export function formatPackageDownloads(scope: string, packageName: string, summary: any): string {
  const weeklyTrends = summary.weeklySums.map((sum: number, i: number) => {
    const weekLabel = i === 0 ? 'this week' : `${i} week${i > 1 ? 's' : ''} ago`;
    return `${weekLabel}: ${sum.toLocaleString()}`;
  }).join(' | ');

  const monthlyTrends = summary.monthlySums.map((sum: number, i: number) => {
    const monthLabel = i === 0 ? 'this month' : `${i} month${i > 1 ? 's' : ''} ago`;
    return `${monthLabel}: ${sum.toLocaleString()}`;
  }).join(' | ');

  return `# 📈 @${scope}/${packageName} Download Statistics

## Summary
- **Total Downloads**: ${summary.totalDownloads.toLocaleString()}
- **Recent Activity** (last 30 periods): ${summary.recentDownloads.toLocaleString()}
- **Latest Version**: v${summary.latestVersion} (${summary.latestVersionDownloads.toLocaleString()} downloads)
- **Last Activity**: ${summary.lastActivity ? new Date(summary.lastActivity).toLocaleDateString() : 'No recent activity'}
- **Data Points**: ${summary.activityEntries}

## Rolling Window Averages
- **Last 7 Days**: ${summary.last7DaysAverage.toLocaleString()} downloads/day
- **Weekly Trends** (${summary.weeklyAverage.toLocaleString()}/week): ${weeklyTrends}
- **Monthly Trends** (${summary.monthlyAverage.toLocaleString()}/month): ${monthlyTrends}

💡 **Use \`package_details\` for full package information.**`;
} 