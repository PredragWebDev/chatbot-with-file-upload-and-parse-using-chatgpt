import {json2csv} from 'json2csv';
import Papa from 'papaparse';
import { Parser } from 'json2csv';
import csv from 'csv-parser';
import xlsx from 'xlsx';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { DocxLoader } from 'langchain/document_loaders/fs/docx';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { CSVLoader } from 'langchain/document_loaders/fs/csv';
import { PDFParser } from 'pdf-parse';

// const createCsvWriter  = require('csv-writer').createArrayCsvWriter;
// import createCsvWriter from 'csv-writer';
import multiparty from 'multiparty';
import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import { forEach, result } from 'lodash';

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

async function parsePDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfParser = new PDFParser();
    pdfParser.loadPDF(dataBuffer);

    pdfParser.on('pdfParser_dataReady', function (parsedData) {
      const content = parsedData.text;

      console.log(content); // or do something else with the parsed content
      return content;
    });

    pdfParser.on('pdfParser_dataError', function (error) {
      console.error('Error occurred while parsing the PDF:', error);
      return 'error';
    });
    
    pdfParser.parse();

  } catch (error) {
    console.error('Error occurred while loading the PDF:', error);
    return 'error';

  }
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const form = new multiparty.Form();

  let ext = "";
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: 'Error parsing form data' });
    }

    if (!files) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let index_of_file = 0;
    const uploadedFiles: string[] = [];

    /// combine uploaded files to one csv
    let data = {};
    for (const file of Object.values(files) as UploadedFile[][]) {
      if (!file || file.length === 0) {
        continue;
      }

      const uploadedFile = file[0] as UploadedFile;

      ext = path.extname(uploadedFile.originalFilename).toLocaleLowerCase();

      if (ext === '.pdf' || ext === '.docx' || ext === '.txt') {

        let loader, filecontent;
        switch (ext) {
          case '.pdf':
            loader = new PDFLoader(uploadedFile.path);
            filecontent = loader.load();
            break;
          case '.txt':
            console.log('filepath>>>', uploadedFile.path);
            filecontent = await fs.promises.readFile(uploadedFile.path, 'utf-8');
            break;
          case '.docx':
            loader = new DocxLoader(uploadedFile.path);
            filecontent = loader.load();
            break;
          default:
            break;
        }
  
        data[`${index_of_file+1} file`] = filecontent.split('\n');
        index_of_file++;
      }

      if (ext === '.csv') {

        const fileData = fs.readFileSync(uploadedFile.path, 'utf8');
  
        const results = Papa.parse(fileData, {
          hearder: true,
          skipEmputyLines:true
          })
  
        const columnName = Object.keys(results.data[0][0])[0];
  
        const columnData = results.data.map((row: { [x: string]: any; }) => row[columnName])
  
        data[`${index_of_file+1} file`] = columnData;
        
        index_of_file ++;
      }

      if (ext === '.xlsx') {
        const workbook = xlsx.readFile(uploadedFile.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
      
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, blankrows: true });
      
        const columnName = Object.keys(jsonData[0])[0];
      
        const columnData = jsonData.map((row) => row[columnName]);
      
        data[`${index_of_file + 1} file`] = columnData;
      
        index_of_file++;
      }
    }

    // if (ext === '.csv' || ext === '.xlsx') {

      const maxLen = Math.max(...Object.values(data).map(arr => arr.length));
      let rows = Array(maxLen).fill().map(() => ({}));
  
      for (let key in data) {
        data[key].forEach((value, i) => {
          rows[i][key] = value;
        });
      }
  
      const json2csvParser = new Parser({ fields: Object.keys(data) });
      const csvfile = json2csvParser.parse(rows);
  
      fs.writeFileSync('combined.csv', csvfile, 'utf8');
    // }

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

        //CSV or XLSX convertion txt
        const ext = path.extname(uploadedFile.originalFilename).toLocaleLowerCase();

        let context = "";
        fs.createReadStream('combined.csv')
        .pipe(csv())
        .on('data', (data) => {

          // console.log('data>>>', data);
          if (data["1 file"] !== "") {

            // console.log("test>>>",data['1 file']);
            context += data[`1 file`] + ', ' +  data[`2 file`] + '\n'
            
          }
          // fs.appendFileSync('test.txt', Object.values(data).join(', ') + '\r\n');
        })
        .on('end', () => {
          context = context.replaceAll('\r', ' ');
          fs.writeFileSync(newFilePath.replace(ext, '.txt'), context);
          console.log('CSV to txt');
        });

        uploadedFiles.push(newFilePath.replace(ext, '.txt'));
        break;

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
