import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  return handleUpload({
    req,
    res,
    onBeforeGenerateToken: async () => {
      return {
        allowedContentTypes: ['text/plain'],
        tokenPayload: {}
      };
    }
  });
}
