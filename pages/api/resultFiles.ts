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

    const { pineconeIndexName, selectedNamespace, sortBy } = req.body;

    const filePath_to_download = process.cwd() + '/result/' + pineconeIndexName + '/' + selectedNamespace;

    fs.readdir(filePath_to_download,async (error, resultFiles) => {
        if (error) {
            console.error('Error reading directory:', error);
            return;
        }

        if (sortBy === "time") {

          resultFiles.sort((a, b) => {
            const fileA = fs.statSync(`${filePath_to_download}/${a}`);
            const fileB = fs.statSync(`${filePath_to_download}/${b}`);
            return fileA.mtime.getTime() - fileB.mtime.getTime();
          });
        } else {
          resultFiles.sort();
        }

        res
        .status(200)
        // .json({ text: response.text, sourceDocuments: response.sourceDocuments });
        .json({ resultFiles: resultFiles });
    })

}