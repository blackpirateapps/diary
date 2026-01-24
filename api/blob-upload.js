import { handleUpload } from '@vercel/blob/client';

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

export const config = {
  api: {
    bodyParser: false
  }
};
