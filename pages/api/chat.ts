import { TextareaProps } from './../../components/other/TextArea';
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
import axios from 'axios';
import { getItem } from '@/libs/localStorageKeys';
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

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const xlsxFile = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    fs.writeFileSync(filename, xlsxFile);
    return 'saved the result to XLSX file!';
  }
  catch (error) {
    return error;
  }
}

const getAPIkeyLimit = async (apikey) => {
  try {
    const response = await axios.get('https://api.openai.com/v1/usage', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apikey}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching API key limit:', error);
    return null;
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
    filetype
  } = req.body;

  const openAIapiKey = req.headers['x-openai-key'];
  const pineconeApiKey = req.headers['x-pinecone-key'];
  const pineconeEnvironment = req.headers['x-pinecone-environment'];
  const targetIndex = req.headers['x-pinecone-index-name'] as string;
  // const filetype = req.headers['X-fileType']


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
      // maxTokens:2048,
      // modelName: "text-davinci-003",
      openAIApiKey: openAIapiKey as string,
    });
    const prompt = PromptTemplate.fromTemplate(
      `{context}
      -----------------
      The sentences above are sentences with the same content in two languages.
      The original text is English and other language is translation.

      {question}
      Provide the original language sentence , other language sentence, the modified version , and explanation why you have made the correction.
      Provide the results in JOSN format like this:
      [
        original English sentence:"",
        original translation:"",
        modified translation:"",
        reason of correction:""
      ]
      If you have not done a correction, please empty the modified translation and the reason of correction.`
    );

    let result ="";
    let response_Source_doc = "";

    const index = pinecone.Index(targetIndex as string);

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

    const docs = fs.readFileSync('my docs.txt').toString();

    const myDocs = JSON.parse(docs);

    // create new file for the result.

    let responseResult = [];
    let count_of_error = 0;

    // for (let i = 0; i < myDocs.length; i++) {

    //   try {
    //     const doc = [myDocs[i]];

    //     const chain = new LLMChain({llm:model, prompt:prompt});
  
    //     // console.log('doc>>>', doc[0]['pageContent']);

    //     const temp = doc[0]['pageContent'].replace(`"`, "'");
  
    //     console.log("temp>>>>", temp);
    //     console.log('getting response...');
  
    //     const response = await chain.call({
    //       context:temp,
    //       question:sanitizedQuestion
    //     })
  
    //     console.log('response>>>>', response.text);
  
    //     const jsonData = JSON.parse(response.text);
  
    //     responseResult = [...responseResult, ...jsonData]
    //   }
    //   catch (error) {

    //     count_of_error ++;
    //     if (count_of_error === 3) {
    //       count_of_error = 0
    //     }
    //     else {

    //       i --;
    //     }
    //     console.log(error.state);
    //   }
      
    // }

    // const limit = await getAPIkeyLimit(openAIapiKey);
    // console.log('api key limit>>>', limit);
    // result = saveDataToXlsx(responseResult, 'result.xlsx');

    // console.log('result>>>>', result);
    
    const chain = makeChain(
      vectorStore,
      returnSourceDocuments,
      modelTemperature,
      openAIapiKey as string,
    );
    const response = await chain.call({
      question: sanitizedQuestion,
      chat_history: history || [],
    });

    console.log('filetype of local storage>>>', filetype);

    const jsonData = JSON.parse(response.text);

    switch (filetype) {
      case 'xlsx':
        result = saveDataToXlsx(jsonData, 'result.xlsx');
        break;
      case 'pdf':
        result = saveDataToXlsx(jsonData, 'result.xlsx');
        break;
      case 'docx':
        result = saveDataToXlsx(jsonData, 'result.xlsx');
        break;
      case 'txt':
        result = saveDataToXlsx(jsonData, 'result.xlsx');
        break;
    
      default:
        result = saveDataToXlsx(jsonData, 'result.xlsx');
        break;
    }
    
    res
      .status(200)
      // .json({ text: response.text, sourceDocuments: response.sourceDocuments });
      .json({ text: result, sourceDocuments: response_Source_doc });
  } catch (error: any) {
    console.log('error', error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
};
