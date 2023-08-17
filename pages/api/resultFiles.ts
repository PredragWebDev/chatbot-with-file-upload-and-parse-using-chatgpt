import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
    ) {
    const filePath_to_download = process.cwd() + '\\public\\result\\';

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