import fs from 'fs/promises';
import path from 'path';
import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
import seedData from '@/data/database.json';

const dataPath = path.join(process.cwd(), 'data', 'database.json');
const blobPath = 'karri-sons/database.json';
const onVercel = Boolean(process.env.VERCEL);

function checkStorage() {
  if (onVercel && !process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('Storage is not connected. Connect a Private Vercel Blob store to this project, then redeploy.');
  }
}

function normalize(data) {
  return { ...data, payments: Array.isArray(data.payments) ? data.payments : [] };
}

async function readBlob() {
  checkStorage();
  const result = await get(blobPath, { access: 'private', useCache: false });
  if (!result) {
    return { data: normalize(seedData), etag: null };
  }
  const data = JSON.parse(await new Response(result.stream).text());
  return { data: normalize(data), etag: result.blob.etag };
}

export async function readDb() {
  if (onVercel) return (await readBlob()).data;
  return normalize(JSON.parse(await fs.readFile(dataPath, 'utf8')));
}

export async function updateDb(mutator) {
  if (!onVercel) {
    const next = await mutator(structuredClone(await readDb()));
    await fs.writeFile(dataPath, JSON.stringify(next, null, 2), 'utf8');
    return next;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, etag } = await readBlob();
    const next = await mutator(structuredClone(data));
    try {
      await put(blobPath, JSON.stringify(next), {
        access: 'private',
        contentType: 'application/json',
        ...(etag ? { allowOverwrite: true, ifMatch: etag } : {})
      });
      return next;
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError || (!etag && /already exists/i.test(error?.message || ''))) continue;
      throw error;
    }
  }
  throw new Error('Data changed during this update. Please try again.');
}
