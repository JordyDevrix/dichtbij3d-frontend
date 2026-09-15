import { Platform, Linking } from 'react-native';
import { request, absoluteUrl } from '../api/client';

export async function downloadFile(pathOrUrl: string, fileName: string): Promise<void> {
  if (Platform.OS === 'web') {
    const isFullExternalUrl = /^https?:\/\//i.test(pathOrUrl) &&
      (typeof window !== 'undefined' && !pathOrUrl.startsWith(window.location.origin) && !pathOrUrl.includes('/api/'));

    let blob: Blob;
    if (isFullExternalUrl) {
      const resp = await fetch(pathOrUrl);
      blob = await resp.blob();
    } else {
      const resp = await request<Response>(pathOrUrl, { raw: true });
      blob = await resp.blob();
    }
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  } else {
    const fullUrl = absoluteUrl(pathOrUrl) || pathOrUrl;
    await Linking.openURL(fullUrl);
  }
}
