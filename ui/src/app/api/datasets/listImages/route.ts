import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDatasetsRoot } from '@/server/settings';

export async function POST(request: Request) {
  const datasetsPath = await getDatasetsRoot();
  const body = await request.json();
  const { datasetName } = body;
  const datasetFolder = path.join(datasetsPath, datasetName);

  try {
    // Check if folder exists
    if (!fs.existsSync(datasetFolder)) {
      return NextResponse.json({ error: `Folder '${datasetName}' not found` }, { status: 404 });
    }

    // Find all images recursively
    const imageFiles = findImagesRecursively(datasetFolder);

    // Sort server-side so the client doesn't have to sort large lists
    imageFiles.sort((a, b) => a.localeCompare(b));

    // Format response
    const usesReferenceImages = hasReferenceDirectory(datasetFolder);
    const result = imageFiles.map(imgPath => ({
      img_path: imgPath,
      reference_path: findReferenceImage(imgPath),
    }));

    return NextResponse.json({ images: result, uses_reference_images: usesReferenceImages });
  } catch (error) {
    console.error('Error finding images:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

function findReferenceImage(imgPath: string): string | null {
  const parsed = path.parse(imgPath);
  const referenceDir = path.join(parsed.dir, '_controls');
  const extensions = ['.jpg', '.jpeg', '.png', '.webp'];
  for (const ext of extensions) {
    const candidate = path.join(referenceDir, `${parsed.name}.reference${ext}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function hasReferenceDirectory(dir: string): boolean {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    if (entry.name === '_controls') return true;
    if (hasReferenceDirectory(path.join(dir, entry.name))) return true;
  }
  return false;
}

/**
 * Recursively finds all image files in a directory and its subdirectories
 * @param dir Directory to search
 * @returns Array of absolute paths to image files
 */
function findImagesRecursively(dir: string): string[] {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.mp4', '.avi', '.mov', '.mkv', '.wmv', '.m4v', '.flv', '.mp3', '.wav', '.flac', '.ogg'];
  let results: string[] = [];

  // withFileTypes avoids a separate statSync per entry — a big win on large datasets
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const name = entry.name;
    if (name.startsWith('.')) continue;
    const itemPath = path.join(dir, name);

    if (entry.isDirectory()) {
      if (name === '_controls') continue;
      results = results.concat(findImagesRecursively(itemPath));
    } else if (entry.isFile()) {
      const ext = path.extname(name).toLowerCase();
      if (imageExtensions.includes(ext)) {
        results.push(itemPath);
      }
    }
  }

  return results;
}
