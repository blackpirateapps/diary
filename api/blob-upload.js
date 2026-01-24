import { handleUpload } from '@vercel/blob';

export default async function handler(req, res) {
  return handleUpload({
    req,
    res,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: ['text/plain'],
      tokenPayload: {}
    })
  });
}
