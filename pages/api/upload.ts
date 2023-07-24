import {json2csv} from 'json2csv';
import Papa from 'papaparse';
import { Parser } from 'json2csv';
import csv from 'csv-parser';
import xlsx from 'xlsx';
// const createCsvWriter  = require('csv-writer').createArrayCsvWriter;
// import createCsvWriter from 'csv-writer';
import multiparty from 'multiparty';
import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import { result } from 'lodash';

interface UploadedFile {
  slice(arg0: number, arg1: number): unknown;
  fieldName: string;
  originalFilename: string;
  path: string;
  headers: any;
  size: number;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const form = new multiparty.Form();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: 'Error parsing form data' });
    }

    if (!files) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let indext_of_file = 0;
    const uploadedFiles: string[] = [];

    /// combine uploaded files to one csv
    let data = {};
    for (const file of Object.values(files) as UploadedFile[][]) {
      if (!file || file.length === 0) {
        continue;
      }

      const uploadedFile = file[0] as UploadedFile;

      const ext = path.extname(uploadedFile.originalFilename).toLocaleLowerCase();

      if (ext === '.csv') {

        const fileData = fs.readFileSync(uploadedFile.path, 'utf8');
  
        const results = Papa.parse(fileData, {
          hearder: true,
          skipEmputyLines:true
  
        })
  
        console.log("file data>>>>",fileData);
        
        const columnName = Object.keys(results.data[0][0])[0];
  
        console.log('column name>>>>', columnName);
  
        const columnData = results.data.map((row: { [x: string]: any; }) => row[columnName])
  
        console.log('column data', columnData);
  
        data[`${indext_of_file+1} file`] = columnData;
        
        indext_of_file ++;
      }
    }

    const maxLen = Math.max(...Object.values(data).map(arr => arr.length));
    let rows = Array(maxLen).fill().map(() => ({}));

    for (let key in data) {
      data[key].forEach((value, i) => {
        rows[i][key] = value;
      });
    }

    const json2csvParser = new Parser({ fields: Object.keys(data) });
    const csv = json2csvParser.parse(rows);

    fs.writeFileSync('combined.csv', csv, 'utf8');

    //______________combine end__________________////
    
    for (const file of Object.values(files) as UploadedFile[][]) {
      if (!file || file.length === 0) {
        continue;
      }
      const uploadedFile = file[0] as UploadedFile;

      if (process.env.NODE_ENV !== 'production') {
        // In local development, move the file from the OS temp directory to the project 'tmp' directory
        const projectTmpDir = path.join(process.cwd(), 'tmp');
        fs.mkdirSync(projectTmpDir, { recursive: true });

        const newFilePath = path.join(
          projectTmpDir,
          uploadedFile.originalFilename,
        );
        // fs.renameSync(uploadedFile.path, newFilePath);

        //CSV or XLSX convertion txt
        const ext = path.extname(uploadedFile.originalFilename).toLocaleLowerCase();

        if (ext ==='.csv' || ext === '.xlsx') {
          
          let isHeader = true;
          fs.createReadStream('combine.csv')
          .pipe(csv())
          .on('data', (data) => {
            if (isHeader) {

              fs.appendFileSync(newFilePath.replace('.csv', '.txt'), Object.keys(data).join(', ') + '\n');
              isHeader = false;
            }
            file_data.push(Object.values(data).join(', '));
            
            fs.appendFileSync(newFilePath.replace('.csv', '.txt'), Object.values(data).join(', ') + '\n');
            fs.appendFileSync('test.txt', Object.values(data).join(', ') + '\r\n');
          })
          .on('end', () => {
            console.log('CSV to txt');
          });

          break;

        } else {
          fs.renameSync(uploadedFile.path, newFilePath);
        }

        uploadedFiles.push(newFilePath.replace(ext, '.txt'));
      } else {
        // In production, just use the file as is
        uploadedFiles.push(uploadedFile.path);
      }
    }

    if (uploadedFiles.length > 0) {
      return res.status(200).json({
        message: `Files ${uploadedFiles.join(', ')} uploaded and moved!`,
      });
    } else {
      return res.status(400).json({ error: 'No files uploaded' });
    }
  });
}
