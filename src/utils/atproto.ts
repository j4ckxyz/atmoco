import { BLUESKY_API_URL } from './config';

interface DidDocumentService {
  id?: string;
  type?: string;
  serviceEndpoint?: string;
}

interface DidDocument {
  id?: string;
  service?: DidDocumentService[];
}

const AT_HANDLE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61})+$/;

export function normalizeHandle(input: string): string {
  const trimmed = input.trim().toLowerCase();
  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
}

export function assertHandle(handle: string): void {
  if (!AT_HANDLE_PATTERN.test(handle)) {
    throw new Error('Please enter a valid Bluesky handle');
  }
}

export async function resolveHandleToDid(handle: string): Promise<string> {
  const url = new URL('/xrpc/com.atproto.identity.resolveHandle', BLUESKY_API_URL);
  url.searchParams.set('handle', handle);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Could not resolve handle to DID');
  }

  const data = (await response.json()) as { did?: string };
  if (!data.did) {
    throw new Error('No DID found for this handle');
  }

  return data.did;
}

async function resolveDidWebDocument(did: string): Promise<DidDocument> {
  const withoutPrefix = did.replace('did:web:', '');
  const segments = withoutPrefix.split(':').map(encodeURIComponent);
  const host = segments[0];
  const path = segments.slice(1);

  const didDocUrl = path.length > 0
    ? `https://${host}/${path.join('/')}/did.json`
    : `https://${host}/.well-known/did.json`;

  const response = await fetch(didDocUrl);
  if (!response.ok) {
    throw new Error('Failed to resolve did:web document');
  }

  return (await response.json()) as DidDocument;
}

async function resolveDidPlcDocument(did: string): Promise<DidDocument> {
  const response = await fetch(`https://plc.directory/${encodeURIComponent(did)}`);
  if (!response.ok) {
    throw new Error('Failed to resolve DID document');
  }

  return (await response.json()) as DidDocument;
}

export async function resolveDidDocument(did: string): Promise<DidDocument> {
  if (did.startsWith('did:plc:')) {
    return resolveDidPlcDocument(did);
  }

  if (did.startsWith('did:web:')) {
    return resolveDidWebDocument(did);
  }

  throw new Error('Unsupported DID method for login flow');
}

export function extractPdsEndpoint(document: DidDocument): string {
  const services = document.service ?? [];
  const pdsService = services.find((service) => {
    const id = service.id ?? '';
    return service.type === 'AtprotoPersonalDataServer' || id.endsWith('#atproto_pds');
  });

  if (!pdsService?.serviceEndpoint) {
    throw new Error('Could not discover account PDS endpoint');
  }

  const endpoint = pdsService.serviceEndpoint.trim();
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    throw new Error('Invalid PDS endpoint returned by DID document');
  }

  return endpoint;
}

export async function resolvePdsFromHandle(rawHandle: string): Promise<{ handle: string; did: string; pds: string }> {
  const handle = normalizeHandle(rawHandle);
  assertHandle(handle);

  const did = await resolveHandleToDid(handle);
  const didDocument = await resolveDidDocument(did);
  const pds = extractPdsEndpoint(didDocument);

  return { handle, did, pds };
}
