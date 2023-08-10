import { OpenAI } from 'langchain/llms/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { ConversationalRetrievalQAChain } from 'langchain/chains';

const CONDENSE_PROMPT = `Given a chat history and a follow-up question, turn the follow-up question into a standalone question that provides all sentences except for the chat history.

Chat History:
{chat_history}

Follow-up input: {question}

Make sure your standalone question is self-contained, clear, and specific. Rephrased standalone question:`;

// --------------------------------------------------

const QA_PROMPT = `
{context}
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
{chat_history}
These sentences were checked already. So check another 10 sentencees except for these sentences.
If you have not done a correction, please empty the modified translation and the reason of correction.`;

// Creates a ConversationalRetrievalQAChain object that uses an OpenAI model and a PineconeStore vectorstore
export const makeChain = (
  vectorstore: PineconeStore,
  returnSourceDocuments: boolean,
  modelTemperature: number,
  openAIapiKey: string,
) => {
  const model = new OpenAI({
    temperature: modelTemperature, // increase temepreature to get more creative answers
    modelName: 'gpt-3.5-turbo', //change this to gpt-4 if you have access
    // modelName: "text-davinci-003",
    openAIApiKey: openAIapiKey
  });

  // Configures the chain to use the QA_PROMPT and CONDENSE_PROMPT prompts and to not return the source documents
  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorstore.asRetriever(),
    {
      qaTemplate: QA_PROMPT,
      questionGeneratorTemplate: CONDENSE_PROMPT,
      returnSourceDocuments,
    },
  );
  return chain;
};
