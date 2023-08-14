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
import process from 'process';
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType } from "docx";
import 'jspdf-autotable';
// import { progressRate } from './global_variable';

let progressRate;

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
    console.log('error>>', error);
    return error;
  }
}

function savaDataToTXT(data, filename) {
  let result = 'the result\n';
  
  // fs.writeFileSync(filename, "the result \n");
  try {

    data.forEach(((node) => {
      result += `${node['original English sentence']}, ${node['original translation']}, ${node['modified translation']}, ${node['reason of correction']}\n`;
    }))

    fs.writeFileSync(filename, result);

      return 'saved the result to text file!';

    // })
  } catch (error) {
    console.log('error>>', error);
    return error;
    
  }
}

function savaDataToPDF(data, filename) {
  try {
    // const doc = new PDFDocument();
    const doc = new jsPDF();
    
    const fontFilePath = process.cwd() + '\\font\\';

    doc.addFont(fontFilePath + 'OpenSans-Regular.ttf', 'customFont', 'normal');

    doc.setFont('customFont');

    console.log('pass encoding!');

    const pageWidth = doc.internal.pageSize.width;
    const textWidth = doc.getStringUnitWidth("the result") * doc.internal.getFontSize();
    const x = (pageWidth - textWidth) / 2;
    const y = 20; // Adjust the y-coordinate as needed

    doc.text("the result", x, y);
    // Write the result header

    const headers = [['original English sentences', 'original translation', 'modified translation', 'reason of correction']];


    console.log('okay?');

    let index = 0;
    let intervalY = doc.internal.getFontSize() + 5;
    // Add each node data to the PDF

    let rows = [];
    data.forEach((node) => {
      console.log(node['original translation']);
      rows.push([node['original English sentence'], node['original translation'], node['modified translation'], node['reason of correction']])

      // doc.text(`${node['original English sentence']}, `, 10, index * intervalY);
      // doc.text(`${node['original translation']}, `, 10 + doc.getStringUnitWidth(node['original English sentence']) * doc.internal.getFontSize(), 40+index * intervalY);
      // doc.text(`${node['modified translation']}, `, 10 + doc.getStringUnitWidth(node['original translation']) * doc.internal.getFontSize(), 40+index * intervalY);
      // doc.text(`${node['reason of correction']} \n`, 10 + doc.getStringUnitWidth(node['modified translation']) * doc.internal.getFontSize(), 40+index * intervalY);

      // index ++;
      // doc.moveDown();
    });

    doc.autoTable({
      styles: {
        font:'customFont'
      },
      head:headers,
      body:rows
    })
    // Save the PDF
    // doc.pipe(fs.createWriteStream(filename));
    // doc.end();

    doc.save(filename)

    return 'Saved the result to the PDF!';
  } catch (error) {
    console.log('error>>>>>>', error);
    return error;
  }
}

function saveDataToDocx(data: any, filename: string) {
  try {

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Existing content ...
            new Paragraph({
              children: [
                new TextRun("The Result"),
              ],
              alignment: AlignmentType.CENTER,
              
            }),
            // Create a table
            new Table({
              rows: [
                // Table header row
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph("original English sentence"), // Header cell content
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph("original translation"), // Header cell content
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph("modified translation"), // Header cell content
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph("reason of correction"), // Header cell content
                      ],
                    }),
                  ],
                }),
                // Table data rows
                ...data.map(row => new TableRow({
                  children: Object.values(row).map(value => new TableCell({children:[new Paragraph(value)]})),
                })),
              ],
            }),
          ],
        },
      ],
    });

    Packer.toBuffer(doc).then((buffer) => {
      fs.writeFileSync(filename, buffer);
    });

      return 'Saved the result to the DOCX!';
  } catch (error) {
      console.log("Error:", error);
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
      English sentences are original text and other language is translation.

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

    let currentPath = process.cwd() + '\\namespace\\' + selectedNamespace;

    let progress_count = 0;

    fs.readdir(currentPath, async (error, files) => {
      if (error) {
        console.error('Error reading directory:', error);
        return;
      }
      for (const file of files) {
        const docs = fs.readFileSync(currentPath + '\\' + file).toString();
        const myDocs = JSON.parse(docs);

        let responseResult = [];

        for (let i = 0; i < myDocs.length; i++) {

          try {
            const doc = [myDocs[i]];

            const chain = new LLMChain({llm:model, prompt:prompt});
            console.log("temp>>>>", doc[0]['pageContent']);
      
            const temp = doc[0]['pageContent'].replace(/"/g, "'");
      
            console.log('getting response...');
      
            const response = await chain.call({
              context:temp,
              question:sanitizedQuestion
            })
      
            progress_count ++;

            progressRate = progress_count/ (myDocs.length * files.length) * 100;

            console.log('response>>>>', response.text);
      
            const jsonData = JSON.parse(response.text);

            console.log('parse okay?');
      
            responseResult = [...responseResult, ...jsonData]

            console.log('error is here?');
          }
          catch (error) {

            console.log('error>>>>', error);
            break;
            // console.log(error.state);
          }
          
        }

        const resultPath = process.cwd() + '\\result';

        if (!fs.existsSync(resultPath)) {
          fs.mkdirSync(resultPath);
        }
        
        switch (filetype) {
          case 'xlsx':
            console.log("save as xlsx");
            result = saveDataToXlsx(responseResult, resultPath + '\\' + file.replace('.txt', '.xlsx'));
            break;
          case 'pdf':
            console.log("save as pdf");

            result = savaDataToPDF(responseResult, resultPath + '\\' + file.replace('.txt', '.pdf'));
            break;
          case 'docx':
            console.log("save as docx");

            result = saveDataToDocx(responseResult, resultPath + '\\' + file.replace('.txt', '.docx'));
            break;
          case 'txt':
            console.log("save as txt");

            result = savaDataToTXT(responseResult, resultPath + '\\' + file);
            break;
          default:
            result = saveDataToXlsx(responseResult, resultPath + '\\' + file.replace('.txt', '.xlsx'));
            break;
        }

      }
      res
        .status(200)
        // .json({ text: response.text, sourceDocuments: response.sourceDocuments });
        .json({ text: result, sourceDocuments: response_Source_doc });
    })
    
  } catch (error: any) {
    console.log('error', error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
};

export async function progress_rate () {
  return progressRate;
}
