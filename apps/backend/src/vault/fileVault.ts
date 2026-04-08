import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export class FileVaultStorage {
  constructor(private readonly rootPath: string) {}

  async writeArtifact(relativePath: string, contents: Buffer): Promise<string> {
    const fullPath = join(this.rootPath, relativePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, contents);
    return fullPath;
  }
}
