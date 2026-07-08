/**
 * @file Singleton Google Cloud Storage client.
 *
 * Uses Application Default Credentials on Cloud Run.
 * Locally, set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path.
 */
import "server-only";

import { Storage, type StorageOptions } from "@google-cloud/storage";
import { getGcsProjectId } from "./config";

let storageClient: Storage | undefined;

/**
 * Returns a shared GCS client instance.
 */
export function getGcsClient(): Storage {
  if (!storageClient) {
    const projectId = getGcsProjectId();
    const options: StorageOptions = {};

    if (projectId) {
      options.projectId = projectId;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      options.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }

    storageClient = new Storage(options);
  }
  return storageClient;
}
