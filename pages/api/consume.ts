import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { initPinecone } from '@/utils/pinecone-client';
import process from 'process';
import { LocalStorage } from "node-localstorage";
import path from 'path';
global.localStorage = new LocalStorage('./docs');

// const filePath = process.env.NODE_ENV === 'production' ? '/tmp' : 'tmp';
const filePath =  path.join(process.cwd(), 'tmp');;


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const openAIapiKey = req.headers['x-openai-key'];
  const pineconeApiKey = req.headers['x-pinecone-key'];
  const targetIndex = req.headers['x-index-name'] as string;
  const pineconeEnvironment = req.headers['x-environment'];

  try {

    const pinecone = await initPinecone(
      pineconeApiKey as string,
      pineconeEnvironment as string,
    );
  
    console.log('pinecone okay?')
  
    if (pinecone == null) {
      res.status(500).json({ error: "Invalid pinecone" });    
      return;
    }
  
    const { namespaceName, chunkSize, overlapSize } = req.query;
  
    let currentPath:string = path.join(process.cwd(), 'namespace');
    // console.log('current path>>>', currentPath);
    // currentPath += '\\namespace';
  
    if (!fs.existsSync(currentPath)) {
  
      fs.mkdirSync(currentPath);
    }
    currentPath += '/' + namespaceName;

    console.log("cur path>>>>", currentPath);

    // currentPath = path.join(currentPath, namespaceName);
  
    if (fs.existsSync(currentPath)) {
      const filesToDelete = fs
          .readdirSync(currentPath)
          .filter(
            (file) =>
              file.endsWith('.pdf') ||
              file.endsWith('.docx') ||
              file.endsWith('.txt') ||
              file.endsWith('.csv'),
          );
        filesToDelete.forEach((file) => {
          fs.unlinkSync(`${currentPath}/${file}`);
        });
    } else {
      fs.mkdirSync(currentPath);
    }

    // Split the PDF documents into smaller chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: Number(chunkSize),
      chunkOverlap: Number(overlapSize),
    });

    // OpenAI embeddings for the document chunks
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: openAIapiKey as string,
    });

    console.log('okay???');
    // Get the Pinecone index with the given name
    const index = pinecone.Index(targetIndex);

    // Store the document chunks in Pinecone with their embeddings
    
    try {
  
      fs.readdir(filePath, async (error, uploadedFiles) => {
        if (error) {
          console.error('Error reading directory:', error);
          return;
        }
  
        console.log('uploaded files>>>', uploadedFiles);
  
        for (const file of uploadedFiles) {
          // Load PDF, DOCS, TXT, CSV files from the specified directory
          const directoryLoader = new TextLoader(filePath + "/" + file);
          const filecontent = await directoryLoader.load();
          console.log('filecontent>>>>', filecontent);
  
          // const modifiedFileContent = filecontent.replace('"', "'");
  
          const docs = await textSplitter.splitDocuments(filecontent);

          
          fs.writeFileSync(currentPath + '/' + file, JSON.stringify(docs));
          
          console.log('docs okay?');
          try {
            await PineconeStore.fromDocuments(docs, embeddings, {
              pineconeIndex: index,
              namespace: namespaceName as string,
              textKey: 'text',
            });
          }
          catch (error:unknown) {

            if (error) {
              if ((error as { message?: string }).message === 'Request failed with status code 401') {

                console.log('here?');
                return res.status(500).json({ error: `${(error as { message?: string }).message}. Please check Openai Api key.` });
              } else {
                res.status(500).json({ error: (error as { message?: string }).message + ". Please check files again." });
              }
              
            } else {
              res.status(500).json({ error: "Failed ingestion. Please check files again." });
            }
          }

          console.log('pinecone store okay?');
          
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
  
      res.status(200).json({ message: 'Data ingestion complete' });
    } catch (error: any) {
      console.log('error>>>>', error.message);
      console.log('error>>>>', error);
  
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
        if (error.message === 'Request failed with status code 401') {
          res.status(500).json({ error: error.message + ". Please check Openai Api key." });
        } else {
          res.status(500).json({ error: error.message + ". Please check files again." });
        }
        
      } else {
        res.status(500).json({ error: "Failed ingestion. Please check files again." });
      }
    }
  } catch (error) {
    res.status(500).json({ error: (error as { message?: string }).message + ". Please check pinecone." });
  }
}
