import type { Metadata } from 'next';
import { MobilePhotoUpload } from '@/components/MobilePhotoUpload';

export const metadata: Metadata = {
  title: 'Send photos · Desk Display',
  description: 'Send photos directly to your Desk Display gallery.',
};

export default async function GalleryUploadPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  return <MobilePhotoUpload token={typeof token === 'string' ? token : ''} />;
}
