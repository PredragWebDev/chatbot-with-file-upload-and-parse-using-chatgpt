import Papa from 'papaparse';
import { Parser } from 'json2csv';
import csv from 'csv-parser';
import xlsx from 'xlsx';
import { DocxLoader } from 'langchain/document_loaders/fs/docx';
import multiparty from 'multiparty';
import { NextApiRequest, NextApiResponse } from 'next';
import path, { resolve } from 'path';
import fs from 'fs-extra';
import pdf from 'pdf-parse';
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

const readDocxFile = async (filePath) => {

  try {
    const directoryLoader = new DocxLoader(filePath);
    const filecontent = await directoryLoader.load();

    return filecontent;
  } catch (error) {
    console.log("error>>>", error);
    return null;
  }
};


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

    console.log("body>>>", fields.inputMethod[0]);

    let index_of_file = 0;
    const uploadedFiles: string[] = [];

    //------------------------------------------//
    const filenames = Object.values(files)
      .flat()
      .map(file => file.originalFilename)
      .sort((a, b) => a.localeCompare(b));

      console.log('filenames>>>>>>', filenames);
    /// combine uploaded files to one csv
    let data = {};
    // for (const file of Object.values(files) as UploadedFile[][]) {
    for (const filename of filenames) {
      const file = Object.values(files).find(file => file[0].originalFilename === filename);
      if (!file || file.length === 0) {
        continue;
      }

      const uploadedFile = file[0] as UploadedFile;

      ext = path.extname(uploadedFile.originalFilename).toLocaleLowerCase();

      console.log('files>>>', uploadedFile.originalFilename);

      if (ext === '.csv') {

        const fileData = fs.readFileSync(uploadedFile.path, 'utf8');
  
        const results = Papa.parse(fileData, {
          hearder: true,
          skipEmputyLines:true
          })
  
        const columnData = results.data.map((row: { [x: string]: any; }) => {
          let tempResult = [];

          console.log('length>>>', row.length);
          for (let i = 1 ; i < row.length; i ++) {

            if (row.length === 1) {
              tempResult.push(row[i]);
            } else {

              tempResult.push(row[0] + ', ' + row[i]);
            }
          }
          if (row.length >= 1) {

            return tempResult;
          } else {
            return tempResult;
          }
        })
  
        data[`${uploadedFile.originalFilename.replace(ext, '.txt')}`] = columnData;
        
        index_of_file ++;
      } else if (ext === '.xlsx') {
        const workbook = xlsx.readFile(uploadedFile.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
      
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, blankrows: true });
      
        // append the data as length
        const columnName = Object.keys(jsonData[0])[0];
      
        const columnData = jsonData.map((row) => {
          let tempResult = [];

          // console.log('length>>>', row.length);
          for (let i = 1 ; i < row.length; i ++) {

            if (row.length === 1) {
              tempResult.push(row[0]);
            } else {

              tempResult.push(row[0] + ', ' + row[i]);
            }
          }
            return tempResult;
        });

        // console.log('colunm data>>>', columnData.flat());
      
        data[`${uploadedFile.originalFilename.replace(ext, '.txt')}`] = columnData.flat();
      
        index_of_file++;
      } else {

        let loader, filecontent;
        switch (ext) {
          case '.pdf':
            const fileBytes = fs.readFileSync(uploadedFile.path);
            const pdfDoc = await pdf(fileBytes);
            filecontent += pdfDoc.text;
            break;
          case '.txt':
            filecontent = await fs.promises.readFile(uploadedFile.path, 'utf-8');
            break;
          case '.docx':
            const temp = await readDocxFile(uploadedFile.path);
            filecontent = temp[0]['pageContent'];
            break;
          default:
            filecontent = await fs.promises.readFile(uploadedFile.path, 'utf-8');
            break;
        }
  
        // console.log("filecontent", filecontent);

        data[`${uploadedFile.originalFilename.replace(ext, '.txt')}`] = filecontent.split('\n');
        index_of_file++;
      }

    }

    const maxLen = Math.max(...Object.values(data).map(arr => arr.length));
    let rows = Array(maxLen).fill().map(() => ({}));

    for (let key in data) {

      console.log('key>>>', key);

      data[key].forEach((value, i) => {
        rows[i][key] = value;
      });
    }


    const json2csvParser = new Parser({ fields: Object.keys(data) });
    const csvfile = json2csvParser.parse(rows);

    console.log('row>>>', csvfile);


    fs.writeFileSync('combined.csv', csvfile, 'utf8');

    //______________combine end__________________////

    // if (fields.inputMethod[0] === 'separate') { // if separate   

      // In local development, move the file from the OS temp directory to the project 'tmp' directory
      const projectTmpDir = path.join(process.cwd(), 'tmp');
      fs.mkdirSync(projectTmpDir, { recursive: true });

      const filesToDelete = fs
        .readdirSync(projectTmpDir)
        .filter(
          (file) =>
            file.endsWith('.pdf') ||
            file.endsWith('.docx') ||
            file.endsWith('.txt') ||
            file.endsWith('.csv'),
        );
      filesToDelete.forEach((file) => {
        fs.unlinkSync(`${projectTmpDir}/${file}`);
      });

      //CSV or XLSX convertion txt

      let header =[];
      let context = [];
      const dataStream = fs.createReadStream('combined.csv')
      .pipe(csv());

      await new Promise<void>((resolve, reject) => {
        dataStream
        .on('data', (data) => {

          if (header.length < 1) {
            header = Object.keys(data);
            console.log('header>>>>', header);
          }
          // console.log('data>>>', data);

          if (fields.inputMethod[0] === 'separate') {

            for (let i = 0 ; i < header.length; i += 2) {
                context[`${header[i]}`] += data[`${header[i]}`] + ', ' + data[`${header[i+1]}`] + '\n';
            }
          } else {
            for (let i = 0 ; i < header.length; i ++) {
                context[`${header[i]}`] += data[`${header[i]}`] + '\n';
            }
          }

        })
        .on('error', err => {
          console.log('error>>>', err);
        })
        .on('end', () => {
          console.log('context length>>>', Object.keys(context).length);
          console.log('context keys', Object.keys(context));

          for (let i = 0; i < Object.keys(context).length ; i ++) {
            const name_of_field = `${Object.keys(context)[i]}`;

            console.log('name of field>>>', name_of_field);
            
            context[`${name_of_field}`] = context[`${name_of_field}`].replaceAll('\r', ' ');
            fs.writeFileSync(path.join(projectTmpDir, name_of_field,), context[`${name_of_field}`]);
            uploadedFiles.push(path.join(projectTmpDir, name_of_field));
            console.log('CSV to txt');
          }

          console.log('length>>>', uploadedFiles.length);

          resolve();
        });

      })

    // } else {
    //   let index_of_file = 0;
    //   for (const file of Object.values(files) as UploadedFile[][]) {
    //     if (!file || file.length === 0) {
    //       continue;
    //     }
    //     const uploadedFile = file[0] as UploadedFile;
  
    //     if (process.env.NODE_ENV !== 'production') {
    //       // In local development, move the file from the OS temp directory to the project 'tmp' directory
    //       const projectTmpDir = path.join(process.cwd(), 'tmp');
    //       fs.mkdirSync(projectTmpDir, { recursive: true });
          
    //       const filesToDelete = fs
    //         .readdirSync(projectTmpDir)
    //         .filter(
    //           (file) =>
    //             file.endsWith('.pdf') ||
    //             file.endsWith('.docx') ||
    //             file.endsWith('.txt') ||
    //             file.endsWith('.csv'),
    //         );
    //       filesToDelete.forEach((file) => {
    //         fs.unlinkSync(`${projectTmpDir}/${file}`);
    //       });
  
    //       const newFilePath = path.join(
    //         projectTmpDir,
    //         uploadedFile.originalFilename,
    //       );
  
    //       //CSV or XLSX convertion txt
    //       const ext = path.extname(uploadedFile.originalFilename).toLocaleLowerCase();
  
    //       let context = "";
    //       let header =[];
    //       fs.createReadStream('combined.csv')
    //       .pipe(csv())
    //       .on('data', (data) => {
  
    //         if (header.length < 1) {
    //           header = Object.keys(data);
    //           console.log('header>>>>', header);
    //         }

    //         if (data[`${header[0]}`] !== "") {
  
    //           context += data[`${header[0]}`] + '\n'
    //         }
    //       })
    //       .on('end', () => {
    //         context = context.replaceAll('\r', ' ');
    //         fs.writeFileSync(newFilePath.replace(ext, '.txt'), context);
    //         console.log('CSV to txt');
    //       });
  
    //       uploadedFiles.push(newFilePath.replace(ext, '.txt'));
    //       index_of_file ++;
  
    //     } else {
    //       // In production, just use the file as is
    //       uploadedFiles.push(uploadedFile.path);
    //     }
    //   }
    // }

    console.log('uploaded file length', uploadedFiles.length);

    if (uploadedFiles.length > 0) {
      return res.status(200).json({
        message: `Files ${uploadedFiles.join(', ')} uploaded and moved!`,
      });
    } else {
      return res.status(400).json({ error: 'No files uploaded' });
    }
  });
}
