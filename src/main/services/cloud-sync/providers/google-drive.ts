/**
 * Google Drive Provider - CloudSyncProvider implementation
 *
 * Uses Google Drive REST API v3 with appDataFolder scope.
 * Files are stored in the hidden app-specific folder (invisible to user in Drive UI).
 */

import type { CloudSyncProvider } from './provider';
import type { CloudFile } from '../types';
import type { GoogleOAuth } from '../oauth/google-oauth';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

export class GoogleDriveProvider implements CloudSyncProvider {
  readonly name = 'google-drive';

  constructor(private oauth: GoogleOAuth) {}

  async upsertFile(name: string, content: string, existingFileId?: string): Promise<CloudFile> {
    const accessToken = await this.oauth.getAccessToken();

    if (existingFileId) {
      return this.updateFile(existingFileId, content, accessToken);
    }

    // Check if file already exists
    const existing = await this.findFile(name);
    if (existing) {
      return this.updateFile(existing.id, content, accessToken);
    }

    // Create new file
    return this.createFile(name, content, accessToken);
  }

  private async createFile(name: string, content: string, accessToken: string): Promise<CloudFile> {
    const metadata = {
      name,
      parents: ['appDataFolder'],
      mimeType: 'application/json',
    };

    // Use multipart upload for efficiency
    const boundary = '---xToolboxBoundary' + Date.now();
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      content,
      `--${boundary}--`,
    ].join('\r\n');

    const response = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create file '${name}': ${errorText}`);
    }

    const data = (await response.json()) as { id: string; name: string; mimeType: string; modifiedTime?: string };
    return {
      id: data.id,
      name: data.name,
      mimeType: data.mimeType,
      modifiedTime: data.modifiedTime || new Date().toISOString(),
    };
  }

  private async updateFile(fileId: string, content: string, accessToken: string): Promise<CloudFile> {
    const response = await fetch(
      `${DRIVE_UPLOAD_API}/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: content,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update file '${fileId}': ${errorText}`);
    }

    const data = (await response.json()) as { id: string; name: string; mimeType: string; modifiedTime?: string };
    return {
      id: data.id,
      name: data.name,
      mimeType: data.mimeType,
      modifiedTime: data.modifiedTime || new Date().toISOString(),
    };
  }

  async readFile(fileId: string): Promise<string> {
    const accessToken = await this.oauth.getAccessToken();

    const response = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to read file '${fileId}': ${errorText}`);
    }

    return response.text();
  }

  async findFile(name: string): Promise<CloudFile | null> {
    const accessToken = await this.oauth.getAccessToken();

    const query = `name='${name}' and 'appDataFolder' in parents and trashed=false`;
    const response = await fetch(
      `${DRIVE_API}/files?spaces=appDataFolder&q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime,size)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to find file '${name}': ${errorText}`);
    }

    const data = (await response.json()) as { files: Array<{ id: string; name: string; mimeType: string; modifiedTime: string; size?: string }> };
    if (!data.files || data.files.length === 0) {
      return null;
    }

    const file = data.files[0];
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
      size: file.size ? parseInt(file.size, 10) : undefined,
    };
  }

  async listFiles(): Promise<CloudFile[]> {
    const accessToken = await this.oauth.getAccessToken();

    const response = await fetch(
      `${DRIVE_API}/files?spaces=appDataFolder&fields=files(id,name,mimeType,modifiedTime,size)&pageSize=1000`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to list files: ${errorText}`);
    }

    const data = (await response.json()) as { files: Array<{ id: string; name: string; mimeType: string; modifiedTime: string; size?: string }> };
    return (data.files || []).map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
      size: file.size ? parseInt(file.size, 10) : undefined,
    }));
  }

  async deleteFile(fileId: string): Promise<void> {
    const accessToken = await this.oauth.getAccessToken();

    const response = await fetch(`${DRIVE_API}/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new Error(`Failed to delete file '${fileId}': ${errorText}`);
    }
  }

  isAuthenticated(): boolean {
    return this.oauth.isAuthenticated();
  }

  async getUserEmail(): Promise<string | null> {
    return this.oauth.getUserEmail();
  }
}
