import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { FileVaultStorage } from "./fileVault.js";

export class VaultStorageManager {
  constructor(private readonly storage: FileVaultStorage) {}

  async preserveTextArtifact(relativePath: string, content: string) {
    const fullPath = await this.storage.writeArtifact(relativePath, Buffer.from(content, "utf8"));
    const checksum = createHash("sha256").update(content).digest("hex");
    return { fullPath, checksum };
  }

  async verifyArtifact(path: string, expectedChecksum?: string) {
    const bytes = await readFile(path);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const status = expectedChecksum && checksum !== expectedChecksum ? "FAILED" : "VERIFIED";
    return { checksum, status };
  }
}
