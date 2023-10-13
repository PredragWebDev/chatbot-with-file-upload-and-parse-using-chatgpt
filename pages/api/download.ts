import { result } from 'lodash';
import fs from 'fs';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';
import process from 'process';
import { URL } from 'url';
import { saveAs } from 'file-saver';

export default async function download(req: { method: string; body: { filename: any; pineconeIndexName: any; selectedNamespace: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; send: { (arg0: string): void; new(): any; }; }; send: (arg0: string) => void; }) {
  // check req.method, you might want to only allow GET requests to this route
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {

    const {filename, pineconeIndexName, selectedNamespace} = req.body // replace with your file's path
    const path = process.cwd() +'\\public\\result\\' + pineconeIndexName + '\\' + selectedNamespace + '\\';

    console.log('file name>>>>', filename);
    console.log('selected namespace>>>', selectedNamespace);

    if (fs.existsSync(path + filename)) {

      fs.unlink(path + filename, (err) => {
        if (err) {
          console.log(err);
          return;
        }
        console.log('File deleted successfully!')
      });

      res.send("don't exist the result file!");

      return "okay";
    } else {
      res.send("don't exist the result file!");
      return "";
    }
  } catch (error) {
    console.log(error);
    res.send("don't exist the result file!!!");
    return;
    // res.result = "don't exist the result file!!!";
  }
}
