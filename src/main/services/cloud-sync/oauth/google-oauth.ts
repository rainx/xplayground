/**
 * Google OAuth2 - Desktop loopback flow
 *
 * 1. Start local HTTP server on random port
 * 2. Open BrowserWindow to Google consent URL
 * 3. User authorizes → Google redirects to localhost
 * 4. Extract auth code → exchange for tokens
 * 5. Store refresh_token encrypted via CryptoService
 */

import { BrowserWindow } from 'electron';
import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import { getCryptoService } from '../../crypto';
import type { OAuthTokens, OAuthClientConfig } from '../types';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

export class GoogleOAuth {
  private tokens: OAuthTokens | null = null;
  private clientConfig: OAuthClientConfig | null = null;

  private getTokensPath(): string {
    return path.join(app.getPath('userData'), 'cloud-sync', 'tokens.enc');
  }

  private getConfigPath(): string {
    return path.join(app.getPath('userData'), 'cloud-sync', 'oauth-config.json');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(path.join(app.getPath('userData'), 'cloud-sync'), { recursive: true });
    await this.loadClientConfig();
    await this.loadTokens();
  }

  setClientConfig(config: OAuthClientConfig): void {
    this.clientConfig = config;
  }

  getClientConfig(): OAuthClientConfig | null {
    return this.clientConfig;
  }

  async saveClientConfig(config: OAuthClientConfig): Promise<void> {
    this.clientConfig = config;
    const configPath = this.getConfigPath();
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  private async loadClientConfig(): Promise<void> {
    try {
      const configPath = this.getConfigPath();
      const data = await fs.readFile(configPath, 'utf-8');
      this.clientConfig = JSON.parse(data);
    } catch {
      // Config doesn't exist yet
    }
  }

  private async loadTokens(): Promise<void> {
    try {
      const tokensPath = this.getTokensPath();
      const cryptoService = getCryptoService();
      this.tokens = await cryptoService.readAndDecryptJSON<OAuthTokens>(tokensPath, 'sync-tokens');
    } catch {
      // Tokens don't exist yet
      this.tokens = null;
    }
  }

  private async saveTokens(tokens: OAuthTokens): Promise<void> {
    this.tokens = tokens;
    const tokensPath = this.getTokensPath();
    const cryptoService = getCryptoService();
    await cryptoService.encryptAndWriteJSON(tokensPath, tokens, 'sync-tokens');
  }

  async clearTokens(): Promise<void> {
    this.tokens = null;
    try {
      await fs.unlink(this.getTokensPath());
    } catch {
      // File might not exist
    }
  }

  isAuthenticated(): boolean {
    return this.tokens !== null && this.tokens.refreshToken !== '';
  }

  /**
   * Get a valid access token, refreshing if needed.
   */
  async getAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    // If token is still valid (with 5-minute buffer), return it
    if (Date.now() < this.tokens.expiresAt - 5 * 60 * 1000) {
      return this.tokens.accessToken;
    }

    // Refresh the token
    return this.refreshAccessToken();
  }

  private async refreshAccessToken(): Promise<string> {
    if (!this.tokens?.refreshToken || !this.clientConfig) {
      throw new Error('Cannot refresh token: missing credentials');
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientConfig.clientId,
        client_secret: this.clientConfig.clientSecret,
        refresh_token: this.tokens.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${errorText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      token_type: string;
      scope: string;
    };

    const updatedTokens: OAuthTokens = {
      ...this.tokens,
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      tokenType: data.token_type,
      scope: data.scope || this.tokens.scope,
    };

    await this.saveTokens(updatedTokens);
    return updatedTokens.accessToken;
  }

  /**
   * Start the OAuth2 login flow.
   * Opens a BrowserWindow for Google consent and starts a local callback server.
   */
  async login(): Promise<OAuthTokens> {
    if (!this.clientConfig) {
      throw new Error('OAuth client credentials not configured. Please provide Client ID and Client Secret.');
    }

    return new Promise<OAuthTokens>((resolve, reject) => {
      let authWindow: BrowserWindow | null = null;
      let server: http.Server | null = null;
      let settled = false;
      let port = 0;

      const cleanup = () => {
        if (authWindow && !authWindow.isDestroyed()) {
          authWindow.close();
          authWindow = null;
        }
        if (server) {
          server.close();
          server = null;
        }
      };

      const settle = (err: Error | null, tokens?: OAuthTokens) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (err) reject(err);
        else resolve(tokens!);
      };

      // Start local HTTP server for callback
      server = http.createServer(async (req, res) => {
        const parsedUrl = url.parse(req.url || '', true);

        if (parsedUrl.pathname !== '/callback') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const code = parsedUrl.query.code as string | undefined;
        const error = parsedUrl.query.error as string | undefined;

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h3>Authorization denied</h3><p>You can close this window.</p></body></html>');
          settle(new Error(`Authorization denied: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<html><body><h3>Error</h3><p>No authorization code received.</p></body></html>');
          settle(new Error('No authorization code received'));
          return;
        }

        try {
          const tokens = await this.exchangeCodeForTokens(code, `http://127.0.0.1:${port}/callback`);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h3>Success!</h3><p>You can close this window and return to xToolbox.</p></body></html>');
          settle(null, tokens);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<html><body><h3>Error</h3><p>Failed to complete authentication.</p></body></html>');
          settle(err instanceof Error ? err : new Error(String(err)));
        }
      });

      // Listen on a random available port, then open auth window
      server.listen(0, '127.0.0.1', () => {
        port = (server!.address() as { port: number }).port;

        const redirectUri = `http://127.0.0.1:${port}/callback`;

        const authUrl = `${GOOGLE_AUTH_URL}?${new URLSearchParams({
          client_id: this.clientConfig!.clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: SCOPES,
          access_type: 'offline',
          prompt: 'consent',
        })}`;

        // Open BrowserWindow for consent
        authWindow = new BrowserWindow({
          width: 600,
          height: 700,
          show: true,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        });

        authWindow.loadURL(authUrl);

        authWindow.on('closed', () => {
          authWindow = null;
          settle(new Error('Authentication window was closed'));
        });
      });

      server.on('error', (err) => {
        settle(new Error(`Failed to start auth server: ${err.message}`));
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        settle(new Error('Authentication timed out'));
      }, 5 * 60 * 1000);
    });
  }

  private async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    if (!this.clientConfig) {
      throw new Error('OAuth client config not set');
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientConfig.clientId,
        client_secret: this.clientConfig.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
      scope: string;
    };

    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      tokenType: data.token_type,
      scope: data.scope,
    };

    await this.saveTokens(tokens);
    return tokens;
  }

  /**
   * Get the authenticated user's email.
   */
  async getUserEmail(): Promise<string | null> {
    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) return null;

      const data = (await response.json()) as { email?: string };
      return data.email || null;
    } catch {
      return null;
    }
  }
}
