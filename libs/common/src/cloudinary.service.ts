import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'da3bln4fp',
      api_key: process.env.CLOUDINARY_API_KEY || '851415645289799',
      api_secret: process.env.CLOUDINARY_API_SECRET || 'iMOd4W_zjR_M-L2deGVIlPpFSlI',
    });
  }

  /**
   * Mengunggah gambar Base64 dari webcam ke Cloudinary CDN
   * Mengembalikan URL HTTPS terkompresi otomatis (WebP/JPEG)
   */
  async uploadImageBase64(base64Data: string, folder = 'wfh_absensi_proofs'): Promise<string> {
    if (!base64Data || !base64Data.startsWith('data:image')) {
      return base64Data; // Kembalikan string awal jika sudah berupa URL HTTPS
    }

    try {
      const result = await cloudinary.uploader.upload(base64Data, {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 600, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      });

      this.logger.log(`Cloudinary Upload Sukses! CDN URL: ${result.secure_url}`);
      return result.secure_url;
    } catch (error: any) {
      this.logger.error(`Gagal upload ke Cloudinary: ${error.message}`);
      return base64Data;
    }
  }
}
