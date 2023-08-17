import React, { useEffect, useState } from 'react';
import { PlusCircleIcon } from '@heroicons/react/20/solid';
import Button from '@/components/buttons/Button';
import { useKeys } from '@/hooks';
import { baseUrl } from '@/utils/baseUrl';
import {
  ListOfChats,
  ListOfNamespaces,
  SourceDocumentsToggle,
  ModelTemperature,
} from './components/index';
import { getItem, setItem } from '@/libs/localStorageKeys';

interface SidebarListProps {
  createChat: () => string;
  selectedNamespace: string;
  returnSourceDocuments: boolean;
  setReturnSourceDocuments: React.Dispatch<React.SetStateAction<boolean>>;
  modelTemperature: number;
  setModelTemperature: React.Dispatch<React.SetStateAction<number>>;
  filteredChatList: string[];
  selectedChatId: string;
  setSelectedChatId: React.Dispatch<React.SetStateAction<string>>;
  nameSpaceHasChats: boolean;
  chatNames: Record<string, string>;
  updateChatName: (chatId: string, newName: string) => void;
  deleteChat: (chatId: string) => void;
  namespaces: string[];
  setSelectedNamespace: React.Dispatch<React.SetStateAction<string>>;
  isLoadingNamespaces: boolean;
}


const SidebarList: React.FC<SidebarListProps> = ({
  selectedNamespace,
  returnSourceDocuments,
  setReturnSourceDocuments,
  modelTemperature,
  setModelTemperature,
  filteredChatList,
  selectedChatId,
  createChat,
  setSelectedChatId,
  nameSpaceHasChats,
  chatNames,
  updateChatName,
  deleteChat,
  namespaces,
  setSelectedNamespace,
  isLoadingNamespaces,
}) => {

  const {
    openAIapiKey,
    pineconeApiKey,
    pineconeEnvironment,
    pineconeIndexName,
  } = useKeys();

  const [filetype, setFiletype] = useState('xlsx');

  const [copyText, setCopyText] = React.useState("copy");
  const [embedScript, setEmbedScript] = React.useState("");

  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
      setItem('filetype', filetype);
      setItem('ischecked', isChecked);
  }, [filetype, isChecked]);


  const copyToClipboard = (content: any) => {
    const el = document.createElement('textarea');
    el.textContent = content;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

  const handleCopy = async () => {
    try {
      if ("clipboard" in navigator) {
        await navigator.clipboard.writeText(embedScript);
        setCopyText("copied");
      } else {
        copyToClipboard(embedScript);
        setCopyText("copied");
      }
    } catch (e) {
      console.error('Could not copy text: ', e);
    }

    setTimeout(() => {
      setCopyText("copy");
    }, 2000);
  }

  useEffect(() => {
    setEmbedScript('<div id="chatbot-container" serverUrl="' + baseUrl() + '" selectedNamespace="' + selectedNamespace + '" openAIapiKey="' + openAIapiKey + '" pineconeApiKey="' + pineconeApiKey + '" pineconeEnvironment="' + pineconeEnvironment + '" pineconeIndexName="' + pineconeIndexName + '"></div>\n<script src="' + baseUrl() + '/chatbot.js"></script>');
  }, [
    selectedNamespace,
    openAIapiKey,
    pineconeApiKey,
    pineconeEnvironment,
    pineconeIndexName,
  ]);
  
  return (
    <nav className="flex flex-col h-full">
      <div>
        {selectedNamespace && (
          <div className="px-4 mb-4 space-y-3">
            <SourceDocumentsToggle
              checked={returnSourceDocuments}
              setReturnSourceDocuments={setReturnSourceDocuments}
            />

            {/* <ModelTemperature
              modelTemperature={modelTemperature}
              setModelTemperature={setModelTemperature}
            /> */}

            <Button
              buttonType="primary"
              buttonText="New chat"
              onClick={async () => {
                const newChatId = createChat();
                setSelectedChatId(newChatId);
              }}
              icon={PlusCircleIcon}
            />
          </div>
        )}
      </div>

      <>
        <div className="w-full px-4 mb-6 space-y-2">
          <div className="text-xs font-semibold leading-6 text-blue-400 sm:text-sm">
            Your namespaces
          </div>
          <ListOfNamespaces
            isLoadingNamespaces={isLoadingNamespaces}
            namespaces={namespaces}
            selectedNamespace={selectedNamespace}
            setSelectedNamespace={setSelectedNamespace}
          />

          {isLoadingNamespaces ? (
          <></>
          ):(
            <div className='flex text-white items-center pl-2'>
            <input 
              className='mr-2'
              type='checkbox'
              checked={isChecked}
              onChange={() => setIsChecked(!isChecked)}
            />
            <p>Resume</p>
          </div>
          )}
        </div>

        {/* {
          selectedNamespace
          ?
          <div className="w-full px-4 mb-6 space-y-2 block">
            <div className="flex items-center justify-between text-xs font-semibold leading-6 text-blue-400 sm:text-sm">
              Embeded Script

              <button onClick={ handleCopy } className="flex p-1 justify-center items-center border border-gray-700 rounded-lg resize-none sm:text-sm md:text-base focus:outline-none">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                { copyText }
              </button>
            </div>
            <label className="h-[120px] block items-center w-full p-2 overflow-y-auto text-xs text-white placeholder-gray-400 whitespace-pre-wrap bg-gray-900 border border-gray-700 rounded-lg resize-none sm:text-sm md:text-base focus:outline-none">
              { embedScript }
            </label>
          </div>
          :
          ''
        } */}

        <div className=' border-t-2 border-white border-solid my-8 px-4'>
          <form >
            <div className='relative mt-4'>
              <p className="text-white text-sm mb-2 text-xl">
                Please select the type of file you want to save.
                {/* {keyName.charAt(0).toUpperCase() + keyName.slice(1)} */}
              </p>
              <select
                id='typeOfFile'
                value={filetype}
                onChange={(e) => {setFiletype(e.target.value)}}
                className=' bg-gray-800 border-gray-700 text-white w-full rounded-md'
              >
                <option value='xlsx'>*.xlsx</option>
                <option value='pdf'>*.pdf</option>
                <option value='docx'>*.docx</option>
                <option value='txt'>*.txt</option>
                <option value='html'>*.html</option>
                <option value='json'>*.json</option>

              </select>
            </div>
          </form>
        </div>
        
        <div className="px-4 text-xs font-semibold leading-6 text-blue-400 sm:text-sm">
          Your chats
        </div>
        <div className="flex-grow px-4 overflow-y-auto">
          {selectedNamespace && nameSpaceHasChats ? (
            <ListOfChats
              filteredChatList={filteredChatList}
              selectedChatId={selectedChatId}
              setSelectedChatId={setSelectedChatId}
              chatNames={chatNames}
              updateChatName={updateChatName}
              deleteChat={deleteChat}
            />
          ) : (
            <div className="text-xs font-semibold leading-6 text-red-400">
              {selectedNamespace
                ? 'No chats in this namespace'
                : 'Select a namespace to display chats'}
            </div>
          )}
        </div>
      </>
    </nav>
  );
};
export default SidebarList;
