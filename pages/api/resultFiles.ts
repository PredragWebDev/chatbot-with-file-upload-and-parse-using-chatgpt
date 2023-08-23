import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import Cors from 'cors';

const cors = Cors({
    methods: ['POST', 'GET', 'HEAD'],
  })
  
  
  // Helper method to wait for a middleware to execute before continuing
  // And to throw an error when an error happens in a middleware
  function runMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    fn: Function
  ) {
    return new Promise((resolve, reject) => {
      fn(req, res, (result: any) => {
        if (result instanceof Error) {
          return reject(result)
        }
  
        return resolve(result)
      })
    })
  }

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
    ) {

    await runMiddleware(req, res, cors)

    const { pineconeIndexName } = req.body;

    const filePath_to_download = process.cwd() + '\\public\\result\\' + pineconeIndexName;

    fs.readdir(filePath_to_download,async (error, resultFiles) => {
        if (error) {
            console.error('Error reading directory:', error);
            return;
        }
        res
        .status(200)
        // .json({ text: response.text, sourceDocuments: response.sourceDocuments });
        .json({ resultFiles: resultFiles });
    })

}