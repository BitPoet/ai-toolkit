import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDatasetsRoot, getTrainingFolder } from '@/server/settings';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imgPath } = body;
    let datasetsPath = await getDatasetsRoot();
    const trainingPath = await getTrainingFolder();

    // make sure the dataset path is in the image path
    if (!imgPath.startsWith(datasetsPath) && !imgPath.startsWith(trainingPath)) {
      return NextResponse.json({ error: 'Invalid image path' }, { status: 400 });
    }

    // make sure it is an image
    if (!/\.(jpg|jpeg|png|bmp|gif|tiff|webp|mp4|mp3|wav|flac|ogg)$/i.test(imgPath.toLowerCase())) {
      return NextResponse.json({ error: 'Not an image' }, { status: 400 });
    }

    // if img doesnt exist, ignore
    if (!fs.existsSync(imgPath)) {
      return NextResponse.json({ success: true });
    }

    // delete it and return success
    fs.unlinkSync(imgPath);

    const parsedImagePath = path.parse(imgPath);
    const referenceDir = path.join(parsedImagePath.dir, '_controls');
    for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
      const referencePath = path.join(referenceDir, `${parsedImagePath.name}.reference${ext}`);
      if (fs.existsSync(referencePath)) {
        fs.unlinkSync(referencePath);
      }
    }

    // check for caption
    const captionPath = imgPath.replace(/\.[^/.]+$/, '') + '.txt';
    if (fs.existsSync(captionPath)) {
      // delete caption file
      fs.unlinkSync(captionPath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create dataset' }, { status: 500 });
  }
}
