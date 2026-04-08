import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export interface LocalDiscoveryFindingInput {
  locator: string;
  findingType: string;
  summary: string;
  metadata: Record<string, unknown>;
}

export class LocalDiscoveryScanner {
  async scan(rootPath: string, scope: string): Promise<LocalDiscoveryFindingInput[]> {
    const findings: LocalDiscoveryFindingInput[] = [];
    const commonDirs = ["Desktop", "Documents", "Downloads", "Pictures", "Music", "Videos", ".config", ".local/share"];

    for (const dirName of commonDirs) {
      const dirPath = join(rootPath, dirName);
      const dirStat = await this.safeStat(dirPath);
      if (!dirStat) {
        continue;
      }

      findings.push({
        locator: dirPath,
        findingType: "directory",
        summary: `Directory ${dirName} present`,
        metadata: { size: dirStat.size, mtimeMs: dirStat.mtimeMs, scope }
      });

      const children = await this.safeRead(dirPath);
      for (const child of children.slice(0, 25)) {
        const childPath = join(dirPath, child);
        const childStat = await this.safeStat(childPath);
        if (!childStat) {
          continue;
        }

        findings.push({
          locator: childPath,
          findingType: childStat.isDirectory() ? "directory_entry" : "file_entry",
          summary: `Metadata inventory for ${child}`,
          metadata: {
            isDirectory: childStat.isDirectory(),
            size: childStat.size,
            mtimeMs: childStat.mtimeMs,
            parent: dirPath,
            scope
          }
        });
      }
    }

    findings.push(...(await this.scanBrowserProfiles(rootPath, scope)));
    findings.push(...(await this.scanStartupItems(rootPath, scope)));

    return findings;
  }

  private async scanBrowserProfiles(rootPath: string, scope: string): Promise<LocalDiscoveryFindingInput[]> {
    const candidates = [
      join(rootPath, ".config", "google-chrome"),
      join(rootPath, ".config", "chromium"),
      join(rootPath, ".mozilla", "firefox")
    ];

    const findings: LocalDiscoveryFindingInput[] = [];
    for (const candidate of candidates) {
      const candidateStat = await this.safeStat(candidate);
      if (!candidateStat) continue;

      findings.push({
        locator: candidate,
        findingType: "browser_profile_root",
        summary: "Browser profile root detected",
        metadata: { size: candidateStat.size, mtimeMs: candidateStat.mtimeMs, scope }
      });
    }

    return findings;
  }

  private async scanStartupItems(rootPath: string, scope: string): Promise<LocalDiscoveryFindingInput[]> {
    const startupDir = join(rootPath, ".config", "autostart");
    const startupStat = await this.safeStat(startupDir);
    if (!startupStat) {
      return [];
    }

    const entries = await this.safeRead(startupDir);
    return entries.map((entry) => ({
      locator: join(startupDir, entry),
      findingType: "startup_item",
      summary: `Startup item discovered: ${entry}`,
      metadata: { scope }
    }));
  }

  private async safeRead(path: string): Promise<string[]> {
    try {
      return await readdir(path);
    } catch {
      return [];
    }
  }

  private async safeStat(path: string) {
    try {
      return await stat(path);
    } catch {
      return null;
    }
  }
}
