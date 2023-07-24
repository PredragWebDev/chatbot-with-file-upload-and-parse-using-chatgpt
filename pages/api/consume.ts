import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { DocxLoader } from 'langchain/document_loaders/fs/docx';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { CSVLoader } from 'langchain/document_loaders/fs/csv';
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { initPinecone } from '@/utils/pinecone-client';

import { LocalStorage } from "node-localstorage";
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

  try {
    // Load PDF, DOCS, TXT, CSV files from the specified directory
    const directoryLoader = new DirectoryLoader(filePath, {
      '.pdf': (path) => new PDFLoader(path),
      '.docx': (path) => new DocxLoader(path),
      '.txt': (path) => new TextLoader(path),
      '.csv': (path) => new CSVLoader(path),
    });

    const rawDocs = await directoryLoader.load();

    // Split the PDF documents into smaller chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: Number(chunkSize),
      chunkOverlap: Number(overlapSize),
    });

    const docs = await textSplitter.splitDocuments(rawDocs);

    console.log('docs>>>', docs);
    console.log('docs length>>', docs.length);

    // save docs to local storage.

    fs.writeFileSync('my docs.txt', JSON.stringify(docs));

    // OpenAI embeddings for the document chunks
    // const embeddings = new OpenAIEmbeddings({
    //   openAIApiKey: openAIapiKey as string,
    // });

    // Get the Pinecone index with the given name
    // const index = pinecone.Index(targetIndex);

    // Store the document chunks in Pinecone with their embeddings

    // await PineconeStore.fromDocuments(docs, embeddings, {
    //   pineconeIndex: index,
    //   namespace: namespaceName as string,
    //   textKey: 'text',
    // });

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
