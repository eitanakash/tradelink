import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

const isLocal = process.env.STORAGE_PROVIDER !== 'S3'
const bucket = process.env.AWS_BUCKET_NAME || 'tradelink-uploads'

// AWS_ENDPOINT is set for R2: https://<accountid>.r2.cloudflarestorage.com
const endpoint = process.env.AWS_ENDPOINT

const s3 = new S3Client(
  isLocal
    ? {
        endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
        region: 'us-east-1',
        credentials: {
          accessKeyId: process.env.MINIO_ROOT_USER || 'minioadmin',
          secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
        },
        forcePathStyle: true,
      }
    : {
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
        // R2 requires a custom endpoint and path-style URLs
        ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      },
)

let bucketReady = false

async function ensureBucket() {
  if (bucketReady) return
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }))
    if (isLocal) {
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      })
      await s3.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: policy }))
    }
  }
  bucketReady = true
}

function getPublicUrl(key: string): string {
  if (isLocal) {
    return `${process.env.MINIO_ENDPOINT || 'http://localhost:9000'}/${bucket}/${key}`
  }
  // AWS_PUBLIC_URL = custom domain or R2 public URL, e.g. https://cdn.travajos.com
  if (process.env.AWS_PUBLIC_URL) {
    return `${process.env.AWS_PUBLIC_URL}/${key}`
  }
  // Standard AWS S3 public URL
  return `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`
}

export async function uploadFile(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
  folder: string,
): Promise<{ url: string; key: string }> {
  await ensureBucket()
  const ext = originalFilename.includes('.') ? originalFilename.split('.').pop() : ''
  const key = `${folder}/${randomUUID()}${ext ? '.' + ext : ''}`
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  )
  return { url: getPublicUrl(key), key }
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}
