import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { resumeUrl, candidateName } = await request.json();

    if (!resumeUrl) {
      return NextResponse.json({ error: 'Resume URL is required' }, { status: 400 });
    }

    // Fetch the resume file server-side
    const response = await fetch(resumeUrl);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch resume' }, { status: response.status });
    }

    // Get the file content
    const fileBuffer = await response.arrayBuffer();

    // Get content type from the original response
    const contentType = response.headers.get('content-type') || 'application/pdf';

    // Create clean filename
    let cleanName = candidateName || 'Candidate';
    cleanName = cleanName
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Keep single spaces
      .trim();

    if (!cleanName) {
      cleanName = 'Candidate';
    } else if (cleanName.length > 50) {
      cleanName = cleanName.substring(0, 50); // Limit length
    }

    // Determine file extension
    let fileExtension = '.pdf'; // Default to PDF
    if (contentType.includes('docx')) fileExtension = '.docx';
    else if (contentType.includes('doc')) fileExtension = '.doc';
    else if (contentType.includes('txt')) fileExtension = '.txt';
    else if (contentType.includes('rtf')) fileExtension = '.rtf';

    // Return the file as a response with proper filename
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${cleanName}${fileExtension}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error downloading resume:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 