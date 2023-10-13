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
import xlsx from 'xlsx';
import axios from 'axios';
import process from 'process';
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType } from "docx";
import 'jspdf-autotable';
import { tableCellClasses } from '@mui/material';
import { Json } from '@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch';
import 'jspdf-autotable';

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

function saveDataToXlsx(data:Json, filename:string) {

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

function savaDataToTXT(data:Json, filename:string) {
  let result = 'the result\n';
  
  // fs.writeFileSync(filename, "the result \n");
  try {
    const keys = Object.keys(data[0]);
    data.forEach(((node:any) => {
      console.log("keys>>>>>>>>",keys);
      keys.map((key:string) => {
        result += node[key] + ','
      })
      result += '\n';

      // result += `${node['original source sentence']}, ${node['original translation']}, ${node['modified translation']}, ${node['reason of correction']}\n`;
    }))

    fs.writeFileSync(filename, result);

      return 'saved the result to text file!';

    // })
  } catch (error) {
    console.log('error>>', error);
    return error;
    
  }
}

function savaDataToPDF(data:Json, filename:string) {
  try {
    // const doc = new PDFDocument();
    const doc = new jsPDF();
    
    const fontFilePath = process.cwd() + '/font/';

    doc.addFont(fontFilePath + 'OpenSans-Regular.ttf', 'customFont', 'normal');

    doc.setFont('customFont');

    console.log('pass encoding!');

    const pageWidth = doc.internal.pageSize.width;
    // const textWidth = doc.getStringUnitWidth("the result") * doc.internal.getFontSize();
    const textWidth = doc.getStringUnitWidth("the result");

    const x = (pageWidth - textWidth) / 2;
    const y = 20; // Adjust the y-coordinate as needed

    doc.text("the result", x, y);

    const keys = Object.keys(data[0]);

    const headers = [keys];

    let index = 0;
    // Add each node data to the PDF

    let rows: any[][] = [];
    data.forEach((node:any) => {
      // headers.map((key) => {
      //   rows.push(node[key])
      // })

      console.log(keys.map(key => node[key]))
      rows.push(keys.map(key => node[key]));
      // rows.push([node['original source sentence'], node['original translation'], node['modified translation'], node['reason of correction']])
    
    });

    // doc.autoTable({
    //   styles: {
    //     font:'customFont'
    //   },
    //   head:headers,
    //   body:rows
    // })

    doc.save(filename)

    return 'Saved the result to the PDF!';
  } catch (error) {
    console.log('error>>>>>>', error);
    return error;
  }
}

function saveDataToDocx(data: Json, filename: string) {
  try {

    const font = {
      name: 'Calibri',
      size: 20,
    };

    const keys = Object.keys(data[0]);

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
                  children: keys.map((key) => (
                    new TableCell({
                      children: [
                        new Paragraph(key),
                      ],
                    })
                  )),
                }),
                // Table data rows
                ...data.map((row:any) => new TableRow({
                  children: Object.values(row).map((value) => new TableCell({children:[new Paragraph({text: value as string})]})),
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
function saveDataToHTML(data:Json, filename: string) {
  try {
    // Create the result header
    const header = "<h1>the result</h1>\n";
  
    // Create the table headers
    const keys = Object.keys(data[0]);
    let tableHeaders = "<tr>"
    keys.map((key) => {
      tableHeaders += `<td>${key}</td>`
    })
    tableHeaders += '\n';

    // const tableHeaders = "<tr><th>original source sentences</th><th>original translation</th><th>modified translation</th><th>reason of correction</th></tr>\n";
  
    // Create the rows for the table
    let rows = '';
    data.forEach((node:any) => {
      rows += "<tr>"
      keys.map((key) => {
        rows += `<td>${node[key]}</td>`;
      })
      rows += '</tr>\n';
      // rows += `<tr><td>${node['original source sentence']}</td><td>${node['original translation']}</td><td>${node['modified translation']}</td><td>${node['reason of correction']}</td></tr>\n`;
    });
  
    // Combine the header, table headers, and rows into an HTML table
    const html = `<html><body>${header}<table>${tableHeaders}${rows}</table></body></html>`;
  
    console.log('html >>>>', html);
    
    // Uncomment the following lines if you want to download the file in the browser
    // const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    // saveAs(blob, 'result.html');
    
    // Comment out this line if you want to download the file in the browser
    fs.writeFileSync(filename, html);

    fs.rename(filename, filename.replace('.txt', '.html'), (error) => {
      if (error) {
        console.log('Renaming file is Error:', error)
      } else {
        console.log('Renamed the file!');
      }
    })
    return 'Saved the result to an HTML file!';
  } catch (error) {
    console.log('Error:', error);
    return error;
  }
}
function saveDataToJson (data:Json, filename: string) {
  try {
    fs.writeFileSync(filename, JSON.stringify(data));
    console.log('Data saved to file:', filename);
  } catch (error) {
    console.error('Error writing JSON string to file', error);
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
    filetype,
    isResume,
    controller
  } = req.body;

  console.log('resume???',isResume);

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
      temperature: 0.9, // increase temepreature to get more creative answers
      modelName: 'gpt-3.5-turbo', //change this to gpt-4 if you have access
      // maxTokens:2048,
      // modelName: "text-davinci-003",
      openAIApiKey: openAIapiKey as string,
    });
    const prompt = PromptTemplate.fromTemplate(
      `{context}
      -----------------
      
      {question}
      

      `
    );

    let result:string ="";
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

    let currentPath = process.cwd() + '/namespace/' + selectedNamespace;

    let progress_count = 0;

    let isBreak = false;
    let isExpired = false;

    let resume = false;
    let saved_content: never[] = [];
    let saved_index = 0;
    let saved_file_name = '';

    let isAbort = false;

    const signal = controller.signal;

    if (isResume === 'true') {
      if (fs.existsSync(currentPath + '/resume.txt')) {
        
        const content_of_resume = fs.readFileSync(currentPath+ '/resume.txt').toString();
        const jsonData_of_content = JSON.parse(content_of_resume);
        saved_file_name = jsonData_of_content[0]['savedFile'];
        saved_index = jsonData_of_content[0]['index'];
        saved_content = jsonData_of_content[0]['content'];
        
        console.log('saved index>>>', saved_index);

        fs.unlink(currentPath + '/resume.txt', (err) => {
          if (err) {
            console.log(err);
          }
          console.log('File deleted successfully!')
        });

      } else {
        console.log('could not find save.txt file');
      }
      
    } 

    console.log("current namespace path>>>>", currentPath);
    
    fs.readdir(currentPath, async (error, files) => {
      if (error) {

        result = "no such namespace";
        console.error('Error reading directory:', error);
      } else {

        for (const file of files) {
  
          if (isResume === 'true') {
  
            if (currentPath + '/' + file === saved_file_name) {
              resume = true;
              isResume === 'false';
            }
          } else {
            if (file !== 'resume.txt') {
      
              resume = true;
            }
          }
  
          if (resume) {

            console.log("docs path>>>>", currentPath + "/" + file);
            
            const docs = fs.readFileSync(currentPath + '/' + file).toString();
            const myDocs = JSON.parse(docs);

            console.log("docs content>>>>.", myDocs);
    
            let responseResult: any[] = saved_content;
    
            const chain = new LLMChain({llm:model, prompt:prompt});
    
            for (let i = saved_index; i < myDocs.length; i++) {
    
              try {
                const doc = [myDocs[i]];
    
                console.log("temp>>>>", doc[0]['pageContent']);
          
                const temp = doc[0]['pageContent'].replace(/"/g, "'");
          
                console.log('getting response...');
          
                const response = await chain.call({
                  context:temp,
                  question:sanitizedQuestion,
                  signal
                })
          
                // console.log('response>>>>', response.text);
          
                const jsonData = JSON.parse(response.text);
    
                responseResult = [...responseResult, ...jsonData]
    
                console.log('error is here?');
              }
              catch (error:unknown) {
  
                if ((error as { message?: string }).message === 'Request failed with status code 429') {
  
                  let contentOfResume = [
                    {
                      savedFile:currentPath + '/' + file,
                      index:i,
                      content:responseResult
                    }
                  ]
      
                  fs.writeFileSync(currentPath + '/resume.txt', JSON.stringify(contentOfResume));
                  isBreak = true;
                  break;
                }
  
                if ((error as { message?: string }).message === 'Request failed with status code 401') {
                  isExpired = true;
                }
  
                if ((error as { name?: string }).name === "AbortError") {
                  isAbort = true;
                  break;
                }
                // console.log(error.state);
              }
              
            }
    
            if (true) {
  
              const resultPath_temp = process.cwd() + `/result`;

              fs.mkdirSync(resultPath_temp, {recursive:true});

              const resultPath_temp2 = resultPath_temp + `/${pineconeApiKey}`;

              fs.mkdirSync(resultPath_temp2, {recursive:true});

              const resultPath = resultPath_temp + '/' + selectedNamespace;

              fs.mkdirSync(resultPath, {recursive:true});

              console.log("result path>>>>>", resultPath);
      
              // if (!fs.existsSync(resultPath)) {
              //   fs.mkdirSync(resultPath);
              // }
              
              switch (filetype) {
                case 'xlsx':
                  console.log("save as xlsx");
                  result = String(saveDataToXlsx(responseResult, resultPath + '/' + file.replace('.txt', '.xlsx')));
                  break;
                case 'pdf':
                  console.log("save as pdf");
      
                  result = String(savaDataToPDF(responseResult, resultPath + '/' + file.replace('.txt', '.pdf')));
                  break;
                case 'docx':
                  console.log("save as docx");
      
                  result = String(saveDataToDocx(responseResult, resultPath + '/' + file.replace('.txt', '.docx')));
                  break;
                case 'txt':
                  console.log("save as txt");
      
                  result = String(savaDataToTXT(responseResult, resultPath + '/' + file));
                  break;
                case 'html':
  
                  result = String(saveDataToHTML(responseResult, resultPath +'/' + file));
                  break;
  
                case 'json':
                  console.log('save as json');
                  result = String(saveDataToJson(responseResult, resultPath + '/' + file.replace('.txt', '.json')));
                  break;
                default:
                  result = String(saveDataToXlsx(responseResult, resultPath + '/' + file.replace('.txt', '.xlsx')));
                  break;
              }
            } else {
              result = 'Aborted the response!';
              break;    
            }
          }
  
        }
      }

      if ( result === '') {
        result = "Don't exist the data in this namespace, please recreate the namespace!";
      }
      

      res
        .status(200)
        // .json({ text: response.text, sourceDocuments: response.sourceDocuments });
        .json({ text: result, sourceDocuments: response_Source_doc, isBreak: isBreak, isExpired:isExpired});
    })
    
  } catch (error: any) {
    console.log('error', error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
};
