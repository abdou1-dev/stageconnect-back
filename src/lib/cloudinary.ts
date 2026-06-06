import { v2 as cloudinary, UploadApiOptions } from 'cloudinary'
import { Readable } from 'stream'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface UploadResult {
  secure_url: string
  public_id: string
}

export function uploadStream(buffer: Buffer, options: UploadApiOptions): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) return reject(error ?? new Error('Upload Cloudinary échoué'))
      resolve({ secure_url: result.secure_url, public_id: result.public_id })
    })
    Readable.from(buffer).pipe(stream)
  })
}
