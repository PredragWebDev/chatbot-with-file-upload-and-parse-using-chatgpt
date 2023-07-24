import { NextApiRequest, NextApiResponse } from 'next';
import Cors from 'cors';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { makeChain } from '@/utils/makechain';
import { initPinecone } from '@/utils/pinecone-client';
import fs from 'fs';

const cors = Cors({
  methods: ['POST', 'GET', 'HEAD'],
})

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result)
      }

      return resolve(result)
    })
  })
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {

  // Run the middleware
  await runMiddleware(req, res, cors)

  const {
    question,
    history,
    selectedNamespace,
    returnSourceDocuments,
    modelTemperature,
  } = req.body;

  const openAIapiKey = req.headers['x-openai-key'];
  const pineconeApiKey = req.headers['x-pinecone-key'];
  const pineconeEnvironment = req.headers['x-pinecone-environment'];
  const targetIndex = req.headers['x-pinecone-index-name'] as string;

  const pinecone = await initPinecone(
    pineconeApiKey as string,
    pineconeEnvironment as string,
  );

  if (pinecone == null) {
    return res.status(500).json({ error: 'Invalid Pincone' }); 
  }

  if (!openAIapiKey) {
    return res.status(500).json({ error: 'OpenAI API key not set' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!question) {
    return res.status(400).json({ message: 'No question in the request' });
  }

  const sanitizedQuestion = question.trim().replaceAll('\n', ' ');
  try {
    const index = pinecone.Index(targetIndex as string);

    let result ="";
    let response_Source_doc = "";
    // OpenAI embeddings for the document chunks
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: openAIapiKey as string,
    });

    const docs = fs.readFileSync('my docs.txt').toString();

    const myDocs = JSON.parse(docs);

    for (let i = 0; i < myDocs.length; i++) {

      const doc = [myDocs[i]];

      console.log('doc>>>>>>>', doc);
      // Store the document chunks in Pinecone with their embeddings
      await PineconeStore.fromDocuments(doc, embeddings, {
        pineconeIndex: index,
        // namespace: namespaceName as string,
        namespace: selectedNamespace as string,
        textKey: 'text',
      });
      
      const vectorStore = await PineconeStore.fromExistingIndex(
        new OpenAIEmbeddings({
          openAIApiKey: openAIapiKey as string,
        }),
        {
          pineconeIndex: index,
          textKey: 'text',
          namespace: selectedNamespace,
        },
      );
      
      const chain = makeChain(
        vectorStore,
        returnSourceDocuments,
        modelTemperature,
        openAIapiKey as string,
        );
        console.log('test okay?');
        const response = await chain.call({
        question: sanitizedQuestion,
        chat_history: history || [],
      });

      result += response.text + '\n';

      response_Source_doc = response.sourceDocuments;
  
      fs.writeFileSync('result.txt', "the result \n\n");
      // fs.writeFileSync('result.txt', response.text);
      fs.appendFileSync('result.txt', response.text);
    }

    // const vectorStore = await PineconeStore.fromExistingIndex(
    //   new OpenAIEmbeddings({
    //     openAIApiKey: openAIapiKey as string,
    //   }),
    //   {
    //     pineconeIndex: index,
    //     textKey: 'text',
    //     namespace: selectedNamespace,
    //   },
    // );
    
    // const chain = makeChain(
    //   vectorStore,
    //   returnSourceDocuments,
    //   modelTemperature,
    //   openAIapiKey as string,
    //   );
    //   console.log('test okay?');
    //   const response = await chain.call({
    //   question: sanitizedQuestion,
    //   chat_history: history || [],
    // });

    res
      .status(200)
      // .json({ text: response.text, sourceDocuments: response.sourceDocuments });
      .json({ text: result, sourceDocuments: response_Source_doc });
  } catch (error: any) {
    console.log('error', error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
};
