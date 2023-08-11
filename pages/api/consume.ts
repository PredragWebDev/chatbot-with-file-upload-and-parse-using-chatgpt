import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { DocxLoader } from 'langchain/document_loaders/fs/docx';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { CSVLoader } from 'langchain/document_loaders/fs/csv';
import { NextApiRequest, NextApiResponse } from 'next';
import fs, { mkdir } from 'fs';
import { initPinecone } from '@/utils/pinecone-client';
import process from 'process';
import { LocalStorage } from "node-localstorage";
import { error } from 'console';
global.localStorage = new LocalStorage('./docs');

const filePath = process.env.NODE_ENV === 'production' ? '/tmp' : 'tmp';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const openAIapiKey = req.headers['x-openai-key'];
  const pineconeApiKey = req.headers['x-pinecone-key'];
  const targetIndex = req.headers['x-index-name'] as string;
  const pineconeEnvironment = req.headers['x-environment'];

  const pinecone = await initPinecone(
    pineconeApiKey as string,
    pineconeEnvironment as string,
  );

  if (pinecone == null) {
    res.status(500).json({ error: "Invalid pinecone" });    
    return;
  }

  const { namespaceName, chunkSize, overlapSize } = req.query;

  let currentPath = process.cwd();
  console.log('current path>>>', currentPath);
  currentPath += '\\namespace';

  if (!fs.existsSync(currentPath)) {

    fs.mkdirSync(currentPath);
  }
  currentPath += '\\' + namespaceName;

  if (!fs.existsSync(currentPath)) {

    fs.mkdirSync(currentPath);
  }
  
  try {

    fs.readdir(filePath, async (error, uploadedFiles) => {
      if (error) {
        console.error('Error reading directory:', error);
        return;
      }

      console.log('uploaded files>>>', uploadedFiles);

      for (const file of uploadedFiles) {
        // Load PDF, DOCS, TXT, CSV files from the specified directory
        const directoryLoader = new TextLoader(filePath + "\\" + file);
        const filecontent = await directoryLoader.load();
        const docs = await textSplitter.splitDocuments(filecontent);

        fs.writeFileSync(currentPath + '\\' + file, JSON.stringify(docs));

        await PineconeStore.fromDocuments(docs, embeddings, {
          pineconeIndex: index,
          namespace: namespaceName as string,
          textKey: 'text',
        });
        
      }
      // Delete the PDF, DOCX, TXT, CSV files
      
      const filesToDelete = fs
        .readdirSync(filePath)
        .filter(
          (file) =>
            file.endsWith('.pdf') ||
            file.endsWith('.docx') ||
            file.endsWith('.txt') ||
            file.endsWith('.csv'),
        );
      filesToDelete.forEach((file) => {
        fs.unlinkSync(`${filePath}/${file}`);
      });
    })
    // Split the PDF documents into smaller chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: Number(chunkSize),
      chunkOverlap: Number(overlapSize),
    });

    // OpenAI embeddings for the document chunks
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: openAIapiKey as string,
    });

    // Get the Pinecone index with the given name
    const index = pinecone.Index(targetIndex);

    // Store the document chunks in Pinecone with their embeddings

    res.status(200).json({ message: 'Data ingestion complete' });
  } catch (error) {
    console.log('error', error);

    // Delete the PDF, DOCX, TXT, CSV files
    const filesToDelete = fs
      .readdirSync(filePath)
      .filter(
        (file) =>
          file.endsWith('.pdf') ||
          file.endsWith('.docx') ||
          file.endsWith('.txt') ||
          file.endsWith('.csv'),
      );
    filesToDelete.forEach((file) => {
      fs.unlinkSync(`${filePath}/${file}`);
    });

    if (error) {
      if (error.status == 401) {
        res.status(500).json({ error: error.message + ". Please check Openai Api key." });
      } else {
        res.status(500).json({ error: error.message + ". Please check files again." });
      }
      
    } else {
      res.status(500).json({ error: "Failed ingestion. Please check files again." });
    }
  }
}
