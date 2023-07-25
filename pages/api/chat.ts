import { NextApiRequest, NextApiResponse } from 'next';
import Cors from 'cors';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { makeChain } from '@/utils/makechain';
import { initPinecone } from '@/utils/pinecone-client';
import fs from 'fs';
import { PromptTemplate } from 'langchain/prompts';
import { OpenAI } from 'langchain/llms/openai';
import { LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import xlsx from 'xlsx';

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

function saveDataToXlsx(data, filename) {

  try {
    const worksheet = xlsx.utils.json_to_sheet(data);

    console.log('makin weksheet is ooay?');

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    console.log('test okay111');

    const xlsxFile = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    console.log('test okay 2222?');
    
    fs.writeFileSync(filename, xlsxFile);
    return 'saved the result to XLSX file!';
  }
  catch (error) {
    return error;
  }
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

    const model = new OpenAI({
      temperature: 0, // increase temepreature to get more creative answers
      modelName: 'gpt-3.5-turbo', //change this to gpt-4 if you have access
      // modelName: "text-davinci-003",
      openAIApiKey: openAIapiKey as string,
    });
    const prompt = PromptTemplate.fromTemplate(
      `{context}
      These are sentences with the same content in two languages.
      The original text is English and other language is translation.

      {question}

      provide the result as following JOSN format
      [
        source:"",
        translation:"",
        modified translation:"",
        resean:""
      ]`
    );

    const chatPrompt = ChatPromptTemplate.fromPromptMessages([
      SystemMessagePromptTemplate.fromTemplate(
        `You are an intelligent AI assistant designed to interpret and answer questions and instructions by referring to specific provided documents. The context from these documents has been processed and made accessible to you. 

        Context include the source and translation.
        You don't need to translate as yourself.
        Your job is to fetch the source, the translation from context, and make sure it's translated correctly.
        And provide the only answer. 

        Here is the context from the documents:

        Context: {context}`
      ),
      HumanMessagePromptTemplate.fromTemplate("{question}"),
    ]);
    // const index = pinecone.Index(targetIndex as string);

    let result ="";
    let response_Source_doc = "";
    // OpenAI embeddings for the document chunks
    // const embeddings = new OpenAIEmbeddings({
    //   openAIApiKey: openAIapiKey as string,
    // });

    const docs = fs.readFileSync('my docs.txt').toString();

    const myDocs = JSON.parse(docs);

    // create new file for the result.
    fs.writeFileSync('result.txt', "the result \n\n");

    for (let i = 0; i < myDocs.length; i++) {

      const doc = [myDocs[i]];

      const chain = new LLMChain({llm:model, prompt:prompt});

      console.log('doc>>>', doc[0]['pageContent']);

      console.log('getting response...');

      const response = await chain.call({
        context:doc[0]['pageContent'],
        question:question
      })

      console.log('response>>>>', response);

      const jsonData = JSON.parse(response);

      console.log('parse okay?');

      result = saveDataToXlsx(jsonData, 'result.xlsx');

      // result = 'Saved the data to XLSX file!';

      // Store the document chunks in Pinecone with their embeddings
      // await PineconeStore.fromDocuments(doc, embeddings, {
      //   pineconeIndex: index,
      //   // namespace: namespaceName as string,
      //   namespace: selectedNamespace as string,
      //   textKey: 'text',
      // });
      
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

      // console.log('vectorstore>>>', vectorStore);
      
      // const chain = makeChain(
      // vectorStore,
      // returnSourceDocuments,
      // modelTemperature,
      // openAIapiKey as string,
      // );

      // console.log('test okay?');

      // const response = await chain.call({
      // question: sanitizedQuestion,
      // chat_history: history || [],
      // });

      // result += response.text + '\n';

      // console.log('response>>>>', response.text);
      // response_Source_doc = response.sourceDocuments;
  
      // // fs.writeFileSync('result.txt', response.text);
      // fs.appendFileSync('result.txt', response.text + '\n\n');
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
