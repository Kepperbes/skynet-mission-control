function pathSeparator(path: string): "/" | "\\" {
  return path.includes("\\") ? "\\" : "/";
}

export function registryPathFromGraphPath(graphPath?: string): string | undefined {
  if (!graphPath) return undefined;
  const separator = pathSeparator(graphPath);
  const lastSeparator = Math.max(graphPath.lastIndexOf("/"), graphPath.lastIndexOf("\\"));
  if (lastSeparator < 0) return undefined;
  return `${graphPath.slice(0, lastSeparator)}${separator}index.json`;
}

export function dashboardRootFromRegistry(registryPath: string): string {
  const suffix = /(?:^|[\\/])src[\\/]data[\\/]graphs[\\/]index\.json$/i;
  return registryPath.replace(suffix, "") || ".";
}

export function graphRegistrationScriptFromRegistry(registryPath: string): string {
  const separator = pathSeparator(registryPath);
  const root = dashboardRootFromRegistry(registryPath);
  return [root, "scripts", "graph-to-dashboard.sh"].join(separator);
}
