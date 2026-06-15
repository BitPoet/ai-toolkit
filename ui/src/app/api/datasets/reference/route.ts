import { NextRequest, NextResponse } from 'next/server';
import { mkdir, unlink, writeFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { getDatasetsRoot } from '@/server/settings';

const referenceExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

function isWithinRoot(candidate: string, root: string): boolean {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedRoot = path.resolve(root);
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(resolvedRoot + path.sep);
}

export async function POST(request: NextRequest) {
  try {
    const datasetsRoot = await getDatasetsRoot();
    const formData = await request.formData();
    const targetPathValue = formData.get('targetPath');
    const file = formData.get('file');

    if (typeof targetPathValue !== 'string' || !(file instanceof File)) {
      return NextResponse.json({ error: 'Target image and reference file are required' }, { status: 400 });
    }

    const targetPath = path.resolve(targetPathValue);
    const targetExtension = path.extname(targetPath).toLowerCase();
    if (
      !isWithinRoot(targetPath, datasetsRoot) ||
      !referenceExtensions.includes(targetExtension) ||
      !fs.existsSync(targetPath) ||
      !fs.statSync(targetPath).isFile()
    ) {
      return NextResponse.json({ error: 'Invalid target image path' }, { status: 400 });
    }

    const extension = path.extname(file.name).toLowerCase();
    if (!referenceExtensions.includes(extension)) {
      return NextResponse.json({ error: 'Unsupported reference image format' }, { status: 400 });
    }

    const parsedTarget = path.parse(targetPath);
    const referenceDir = path.join(parsedTarget.dir, '_controls');
    await mkdir(referenceDir, { recursive: true });

    for (const existingExtension of referenceExtensions) {
      const existingPath = path.join(referenceDir, `${parsedTarget.name}.reference${existingExtension}`);
      if (fs.existsSync(existingPath)) {
        await unlink(existingPath);
      }
    }

    const referencePath = path.join(referenceDir, `${parsedTarget.name}.reference${extension}`);
    await writeFile(referencePath, Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ success: true, reference_path: referencePath });
  } catch (error) {
    console.error('Reference image upload error:', error);
    return NextResponse.json({ error: 'Failed to upload reference image' }, { status: 500 });
  }
}
