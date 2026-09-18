import fs from 'fs/promises';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data', 'database.json');

export async function readDb() {
  const raw = await fs.readFile(dataPath, 'utf8');
  return JSON.parse(raw);
}

export async function writeDb(data) {
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

export async function updateDb(mutator) {
  const data = await readDb();
  const next = await mutator(structuredClone(data));
  await writeDb(next);
  return next;
}
