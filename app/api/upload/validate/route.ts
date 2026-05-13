import { NextResponse } from 'next/server';
import { validateFileUpload, optimizeImage, generateOptimizedFilename } from '@/lib/image-optimization';
import { rateLimitMiddleware, RATE_LIMITS, getClientIdentifier } from '@/lib/rate-limit';
import { requireActorContext } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase';

const MAX_UPLOADS_PER_HOUR = 50;
const ALLOWED_UPLOAD_TYPES = new Set(['avatar', 'general', 'document']);

// SECURITY FIX: Magic byte signatures for common image formats
const IMAGE_MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
};

// SECURITY FIX: Map MIME types to expected extensions
const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

/**
 * Validate image file using magic bytes
 * SECURITY FIX: Prevents MIME type spoofing attacks
 */
function validateImageMagicBytes(buffer: Buffer): { valid: boolean; error?: string } {
  const bufferArray = Array.from(buffer.slice(0, 12)); // Check first 12 bytes
  
  for (const [mimeType, signatures] of Object.entries(IMAGE_MAGIC_BYTES)) {
    for (const signature of signatures) {
      if (signature.every((byte, index) => bufferArray[index] === byte)) {
        return { valid: true };
      }
    }
  }
  
  return { valid: false, error: 'File does not match any known image format' };
}

/**
 * Get expected file extensions for a MIME type
 */
function getExpectedExtensions(mimeType: string): string[] {
  return MIME_TO_EXTENSIONS[mimeType] || [];
}

/**
 * Validate and process file upload
 * POST /api/upload/validate
 */
export async function POST(req: Request) {
  try {
    const access = await requireActorContext(
      {
        allowedRoles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"],
        requireSchool: true,
      },
      req
    );
    if (!access.ok) return access.response;

    const identifier = getClientIdentifier(req, access.context.userId);
    const rateLimit = await rateLimitMiddleware(
      req,
      identifier,
      RATE_LIMITS.parent.heavy
    );
    if (rateLimit) return rateLimit;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = normalizeUploadType(formData.get('type'));
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!ALLOWED_UPLOAD_TYPES.has(type)) {
      return NextResponse.json(
        { error: 'Unsupported upload type' },
        { status: 400 }
      );
    }
    
    // Validate file - check MIME type and extension
    const validation = validateFileUpload({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // SECURITY FIX: Additional server-side validation
    // Verify file extension matches claimed MIME type
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    const expectedExtensions = getExpectedExtensions(file.type);
    if (ext && !expectedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: 'File extension does not match file type' },
        { status: 400 }
      );
    }
    
    // Convert to buffer for further validation
    const buffer: Buffer<ArrayBufferLike> = Buffer.from(await file.arrayBuffer());
    
    // SECURITY FIX: Validate magic bytes for images
    if (file.type.startsWith('image/')) {
      const magicByteValidation = validateImageMagicBytes(buffer);
      if (!magicByteValidation.valid) {
        return NextResponse.json(
          { error: 'Invalid image file' },
          { status: 400 }
        );
      }
    }
    
    let processedBuffer: Buffer<ArrayBufferLike> = buffer;
    let metadata = { size: buffer.length, format: file.type };
    let optimizedFilename = buildScopedFilename(file.name);
    
    // Optimize images
    if (file.type.startsWith('image/')) {
      const optimization = await optimizeImage(buffer, {
        maxWidth: type === 'avatar' ? 400 : 1200,
        maxHeight: type === 'avatar' ? 400 : 1200,
        quality: type === 'avatar' ? 85 : 80,
        maxSizeKB: type === 'avatar' ? 100 : 200,
      });
      
      processedBuffer = optimization.buffer;
      metadata = optimization.metadata;
      optimizedFilename = generateOptimizedFilename(file.name);
    }
    
    // Generate upload URL (presigned)
    const bucket = type === 'avatar' ? 'profile-avatars' : 'uploads';
    const path = `${access.context.schoolId}/${access.context.userId}/${type}/${optimizedFilename}`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUploadUrl(path);
    
    if (uploadError) {
      throw uploadError;
    }
    
    return NextResponse.json({
      valid: true,
      uploadUrl: uploadData?.signedUrl,
      path,
      bucket,
      filename: optimizedFilename,
      originalSize: file.size,
      optimizedSize: processedBuffer.length,
      compressionRatio: Math.round((1 - processedBuffer.length / file.size) * 100),
      metadata,
      maxFileSize: file.type.startsWith('image/') ? 2 * 1024 * 1024 : 5 * 1024 * 1024,
    });
    
  } catch (error: unknown) {
    console.error('[Upload] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}

/**
 * Get upload policy and limits
 * GET /api/upload/validate
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'general';
  
  const policies = {
    avatar: {
      maxSize: 2 * 1024 * 1024, // 2MB before optimization
      optimizedMaxSize: 100 * 1024, // 100KB after
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      dimensions: { min: 100, max: 400 },
      format: 'webp',
    },
    general: {
      maxSize: 5 * 1024 * 1024,
      optimizedMaxSize: 200 * 1024,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      format: 'webp',
    },
    document: {
      maxSize: 1 * 1024 * 1024,
      optimizedMaxSize: 500 * 1024,
      allowedTypes: ['application/pdf'],
    },
  };
  
  return NextResponse.json({
    policy: policies[type as keyof typeof policies] || policies.general,
    blockedTypes: ['video/', 'audio/', 'application/x-msvideo'],
    maxUploadsPerHour: MAX_UPLOADS_PER_HOUR,
  });
}

function normalizeUploadType(value: FormDataEntryValue | null) {
  return String(value || 'general').trim().toLowerCase() || 'general';
}

function buildScopedFilename(originalName: string) {
  const extension = String(originalName || '')
    .split('.')
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '') || 'bin';

  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
}
