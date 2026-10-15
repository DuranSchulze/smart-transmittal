import { parseGoogleLink } from "./google-links";
import { isImageDocument } from "../lib/import-file-policy";

// Google Drive Service - Uses access token from Better Auth session

const AUTH_SERVER =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const TOKEN_CACHE_MS = 50 * 60 * 1000; // 50 minutes (tokens last ~60 min)

export class DriveTokenManager {
    private accessToken: string | null = null;
    private expiresAt = 0;

    getValidToken(): string | null {
        return this.accessToken && Date.now() < this.expiresAt
            ? this.accessToken
            : null;
    }

    store(accessToken: string, expiresAt?: string): void {
        this.accessToken = accessToken;
        const parsedExpiry = expiresAt ? Date.parse(expiresAt) : NaN;
        const serverExpiry = Number.isFinite(parsedExpiry) ? parsedExpiry - 60_000 : Infinity;
        this.expiresAt = Math.min(Date.now() + TOKEN_CACHE_MS, serverExpiry);
    }

    clear(): void {
        this.accessToken = null;
        this.expiresAt = 0;
    }
}

export const driveTokenManager = new DriveTokenManager();

let tokenRequest: Promise<string> | null = null;
let tokenGeneration = 0;

// Share token requests across browsing and imports. Clearing on logout prevents
// an older in-flight response from repopulating the next session's cache.
export const getGoogleAccessToken = async (forceRefresh = false): Promise<string> => {
    const cachedToken = driveTokenManager.getValidToken();
    if (!forceRefresh && cachedToken) return cachedToken;
    if (tokenRequest) return tokenRequest;
    const generation = tokenGeneration;
    const request = (async () => {
        const response = await fetch(`${AUTH_SERVER}/api/google-token${forceRefresh ? "?refresh=1" : ""}`, {
            credentials: "include", cache: "no-store", signal: AbortSignal.timeout(20_000),
        });
        const data = await response.json().catch(() => ({}));
        if (generation !== tokenGeneration) throw new Error("Google session changed. Please retry.");
        if (!response.ok || typeof data.accessToken !== "string" || !data.accessToken) {
            driveTokenManager.clear();
            throw new Error(data.error || "Google Drive is disconnected. Please sign in again.");
        }
        driveTokenManager.store(data.accessToken, data.expiresAt);
        return data.accessToken;
    })();
    tokenRequest = request;
    try { return await request; }
    finally { if (tokenRequest === request) tokenRequest = null; }
};

export const clearGoogleToken = () => {
    tokenGeneration += 1;
    tokenRequest = null;
    driveTokenManager.clear();
};

export class DriveAccessError extends Error {}

export const driveApiFetch = async (url: string, init?: RequestInit): Promise<Response> => {
    const request = async (token: string) => {
        const headers = new Headers(init?.headers);
        headers.set("Authorization", `Bearer ${token}`);
        return fetch(url, { ...init, headers, signal: init?.signal || AbortSignal.timeout(45_000) });
    };
    let response = await request(await getGoogleAccessToken());
    if (response.status === 401) response = await request(await getGoogleAccessToken(true));
    if (!response.ok) {
        if (response.status === 401) {
            driveTokenManager.clear();
            throw new DriveAccessError("Google Drive session expired. Please sign in again.");
        }
        if (response.status === 403 || response.status === 404) {
            throw new DriveAccessError("Cannot access this Google file or folder. Check sharing permissions and the Google account you signed in with.");
        }
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error?.message || `Drive request failed (${response.status}). Please retry.`);
    }
    return response;
};

export type DriveFile = { id: string; name: string; mimeType: string; resourceKey?: string };
const FOLDER_MIME = "application/vnd.google-apps.folder";
const escapeQuery = (value: string) => value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
const resourceHeaders = (id: string, resourceKey?: string) => resourceKey
    ? { "X-Goog-Drive-Resource-Keys": `${id}/${resourceKey}` } : undefined;

// Check if user has Google Drive access
export const checkDriveAccess = async (): Promise<boolean> => {
    try {
        await getGoogleAccessToken();
        return true;
    } catch {
        return false;
    }
};

export const getFileContentAsBase64 = async (fileId: string, sourceMimeType?: string, resourceKey?: string, purpose: "document" | "agency-logo" = "document"): Promise<{base64: string, mimeType: string}> => {
    if (purpose === "document" && isImageDocument(sourceMimeType || "")) throw new Error("Image imports are not supported. Use PDF or Word documents.");
    if (purpose === "agency-logo" && !/^image\/(png|jpeg|webp|gif)$/.test(sourceMimeType || "")) throw new Error("Choose a PNG, JPG, WebP, or GIF logo.");
    const maxBytes = (purpose === "agency-logo" ? 2 : 18) * 1024 * 1024;
    const isGoogleDocument = ["application/vnd.google-apps.document", "application/vnd.google-apps.presentation"].includes(sourceMimeType || "");
    const url = isGoogleDocument
        ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=application%2Fpdf`
        : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
    const response = await driveApiFetch(url, { headers: resourceHeaders(fileId, resourceKey) });
    if (Number(response.headers.get("content-length")) > maxBytes) throw new Error(`File is too large (maximum ${maxBytes / 1024 / 1024} MB).`);

    if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

    const blob = await response.blob();
    if (blob.size > maxBytes) throw new Error(`File is too large (maximum ${maxBytes / 1024 / 1024} MB).`);
    const responseMimeType = blob.type.split(";")[0].trim();
    if (purpose === "document" && isImageDocument(responseMimeType)) throw new Error("Image imports are not supported. Use PDF or Word documents.");
    const mimeType = isGoogleDocument ? "application/pdf"
        : !responseMimeType || responseMimeType === "application/octet-stream"
            ? sourceMimeType || "application/octet-stream" : responseMimeType;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve({ base64: result.split(',')[1], mimeType });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const extractFolderIdFromLink = (link: string): string | null => {
    const parsed = parseGoogleLink(link);
    return parsed?.kind === "folder" ? parsed.id : null;
};
export const isFolderLink = (link: string): boolean => parseGoogleLink(link)?.kind === "folder";
export const extractFileIdFromLink = (link: string): string | null => {
    const parsed = parseGoogleLink(link);
    return parsed && parsed.kind !== "folder" ? parsed.id : null;
};

export const getFileMetadata = async (fileId: string, resourceKey?: string): Promise<DriveFile> => {
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,resourceKey&supportsAllDrives=true`;
    const response = await driveApiFetch(url, { headers: resourceHeaders(fileId, resourceKey) });
    if (!response.ok) {
        throw new Error(`Failed to get file metadata: ${response.status} ${response.statusText}`);
    }
    return response.json();
};

async function listPage(query: string, pageToken?: string, headers?: HeadersInit): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("fields", "nextPageToken,files(id,name,mimeType,resourceKey)");
    url.searchParams.set("orderBy", "modifiedTime desc");
    url.searchParams.set("q", query);
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await driveApiFetch(url.toString(), { headers });
    const data = await response.json();
    return { files: data.files || [], nextPageToken: data.nextPageToken };
}

export const listFilesInFolder = async (folderId: string, resourceKey?: string): Promise<DriveFile[]> => {
    const query = `'${escapeQuery(folderId)}' in parents and trashed = false and mimeType != '${FOLDER_MIME}'`;
    const files: DriveFile[] = [];
    let token: string | undefined;
    do {
        const page = await listPage(query, token, resourceHeaders(folderId, resourceKey));
        files.push(...page.files);
        token = page.nextPageToken;
    } while (token);
    return files;
};

export const listDriveFilePage = (query?: string, pageToken?: string) => listPage(
    `trashed = false and mimeType != '${FOLDER_MIME}' and not mimeType contains 'image/'${query ? ` and name contains '${escapeQuery(query)}'` : ""}`,
    pageToken,
);

// Compatibility for callers that only need the initial page.
export const listDriveFiles = async (query?: string): Promise<DriveFile[]> =>
    (await listDriveFilePage(query)).files;

export const listDriveFolders = async (parentId?: string, searchQuery?: string): Promise<Array<{ id: string; name: string }>> => {
    const conditions = [`mimeType = '${FOLDER_MIME}'`, "trashed = false"];
    if (parentId) conditions.push(`'${escapeQuery(parentId)}' in parents`);
    if (searchQuery) conditions.push(`name contains '${escapeQuery(searchQuery)}'`);
    const files: DriveFile[] = [];
    let token: string | undefined;
    do {
        const page = await listPage(conditions.join(" and "), token);
        files.push(...page.files);
        token = page.nextPageToken;
    } while (token);
    return files;
};

// Upload a file (Blob) to Google Drive in the specified folder
export const uploadFileToDrive = async (
    blob: Blob,
    fileName: string,
    folderId: string,
    mimeType?: string,
): Promise<{ id: string; name: string; webViewLink: string }> => {
    const accessToken = await getGoogleAccessToken();

    const metadata = {
        name: fileName,
        parents: [folderId],
    };

    const form = new FormData();
    form.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
    );
    form.append('file', blob, fileName);

    const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink&supportsAllDrives=true',
        {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: form,
        },
    );

    if (response.status === 401) {
        const freshToken = await getGoogleAccessToken(true);
        const retryResponse = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink&supportsAllDrives=true',
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${freshToken}` },
                body: form,
            },
        );
        if (!retryResponse.ok) {
            const err = await retryResponse.json().catch(() => ({}));
            throw new Error(err?.error?.message || `Upload failed: ${retryResponse.status}`);
        }
        return retryResponse.json();
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Upload failed: ${response.status}`);
    }

    return response.json();
};
