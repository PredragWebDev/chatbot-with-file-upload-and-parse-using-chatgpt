import { result } from 'lodash';
import fs from 'fs';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';
import process from 'process';
import { URL } from 'url';
import { saveAs } from 'file-saver';

export default async function download(req, res) {
  // check req.method, you might want to only allow GET requests to this route
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {

    const path = process.cwd() +'\\public\\result\\'
    const {filename} = req.body // replace with your file's path

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
