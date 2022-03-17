import { dirname, resolve } from 'path';
import { cwd } from 'process';
import { mkdir, readFile, writeFile, copyFile } from 'fs/promises';

export const read = async src => JSON.parse(`${await readFile(src)}`);

export const write = async (src, data) => {
  const path = resolve(cwd(), src);
  await mkdir(dirname(path), { recursive: true });
  return writeFile(path, JSON.stringify(data, null, 2));
};

export const copy = async (src, dest) => {
  const path = resolve(cwd(), dest);
  await mkdir(dirname(path), { recursive: true });
  return copyFile(src, dest);
};