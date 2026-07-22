import { NextRequest, NextResponse } from 'next/server';
import { parseImsccCartridge, parseCanvasJsonPayload } from '@/lib/parser/imsccParser';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No file uploaded in form data. Please upload a valid .imscc file.' },
          { status: 400 }
        );
      }

      const course = await parseImsccCartridge(file);
      return NextResponse.json({ success: true, course });
    } 
    
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const jsonString = typeof body === 'string' ? body : JSON.stringify(body);
      const course = parseCanvasJsonPayload(jsonString);
      return NextResponse.json({ success: true, course });
    }

    return NextResponse.json(
      { error: 'Unsupported Content-Type. Please upload multipart/form-data or application/json.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in /api/parse-cartridge:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse Canvas IMSCC cartridge package.' },
      { status: 500 }
    );
  }
}
