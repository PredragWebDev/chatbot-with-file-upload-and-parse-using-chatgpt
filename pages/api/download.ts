import fs from 'fs';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';

export default function download(req, res) {
  // check req.method, you might want to only allow GET requests to this route
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const filePath = path.resolve('./result.xlsx'); // replace with your file's path
  const stat = fs.statSync(filePath);
  const readStream = fs.createReadStream(filePath);

  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename=result.xlsx'); // replace with your file's name and extension

  // stream the file
  readStream.pipe(res);
}
