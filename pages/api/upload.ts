import csv from 'csv-parser';
import xlsx from 'xlsx';

import multiparty from 'multiparty';
import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

interface UploadedFile {
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

    const uploadedFiles: string[] = [];
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
        fs.renameSync(uploadedFile.path, newFilePath);

        //CSV or XLSX convertion txt
        const ext = path.extname(uploadedFile.originalFilename).toLocaleLowerCase();

        if (ext ==='csv') {
          const csvData: any[] = [];
          fs.createReadStream(newFilePath)
          .pipe(csv())
          .on('data', (data) => csvData.push(data))
          .on('end', () => {
            fs.writeFileSync(newFilePath.replace('.csv', '.txt'), JSON.stringify(csvData));
          });
        } else if (ext === '.xlsx') {
          const workbook = xlsx.readFile(newFilePath);
          const sheetNameList = workbook.SheetNames;
          const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]]);
          fs.writeFileSync(newFilePath.replace('.xlsx', '.txt'), JSON.stringify(jsonData));
        }
        
        uploadedFiles.push(newFilePath);
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
