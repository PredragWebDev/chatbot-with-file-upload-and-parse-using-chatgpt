import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { LoadingDots } from '@/components/other';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/other/accordion/Accordion';
import remarkGfm from 'remark-gfm';
import { Message } from '@/types';
import fileDialog from 'file-dialog';
import NextNProgress from 'nextjs-progressbar';
import nProgress from 'nprogress';
import ProgressBar from "@ramonak/react-progress-bar";
import ReactLoading from "react-loading";
import { saveAs } from 'file-saver';
interface MessageListProps {
  messages: Message[];
  loading: boolean;
  messageListRef: React.RefObject<HTMLDivElement>;
}

function MessageList({ messages, loading, messageListRef}: MessageListProps) {

  const [filePath, setFilePath] = useState('');
  
  const handle_save = async (index_of_message:any) => {
    
    const blob = new Blob([messages[index_of_message].message], { type: 'text/plain;charset=utf-8' });

    saveAs(blob);
    
  }

  return (
    <>
      <div className="overflow-y-auto">
        <div ref={messageListRef}>
          {messages.map((message, index) => {
            const isApiMessage = message.type === 'apiMessage';
            const messageClasses = ` ${
              isApiMessage ? 'bg-gray-700/50' : 'bg-gray-800'
            }`;

            return (
              <div key={`chatMessage-${index}`} className={messageClasses}>
                <div className="flex items-center justify-start max-w-full sm:max-w-4xl  mx-auto overflow-hidden px-2 sm:px-4">
                  <div className="flex flex-col w-full">
                    <div className="w-full text-gray-300 p-2 sm:p-4 overflow-wrap break-words">
                      <span
                        className={`mt-2 inline-flex items-center rounded-md px-2 py-1 text-xs sm:text-sm font-medium ring-1 ring-inset ${
                          isApiMessage
                            ? 'bg-indigo-400/10 text-indigo-400 ring-indigo-400/30'
                            : 'bg-purple-400/10 text-purple-400 ring-purple-400/30'
                        }`}
                      >
                        {isApiMessage ? 'AI' : 'YOU'}
                      </span>
                      <div className="mx-auto max-w-full flex justify-between">
                        <ReactMarkdown
                          linkTarget="_blank"
                          className="markdown text-xs sm:text-sm md:text-base leading-relaxed"
                          remarkPlugins={[remarkGfm]}
                        >
                          {message.message}
                        </ReactMarkdown>
                        {isApiMessage ? '' : 
                        <button onClick={() =>handle_save(index)}>
                          <span className={`mt-2 inline-flex items-center rounded-md px-2 py-1 text-xs sm:text-sm font-medium ring-1 ring-inset ${
                          isApiMessage
                            ? 'bg-indigo-400/10 text-indigo-400 ring-indigo-400/30'
                            : 'bg-purple-400/10 text-purple-400 ring-purple-400/30'
                          }`}>
                          Save
                          </span>
                        </button>}
                        
                      </div>
                    </div>
                    {message.sourceDocs && (
                      <div
                        className="mt-4 mx-2 sm:mx-4"
                        key={`sourceDocsAccordion-${index}`}
                      >
                        <Accordion
                          type="single"
                          collapsible
                          className="flex flex-col"
                        >
                          {message.sourceDocs.map((doc, docIndex) => (
                            <div
                              key={`messageSourceDocs-${docIndex}`}
                              className="mb-6 px-4 py-0 sm:py-1 bg-gray-700 rounded-lg shadow-md"
                            >
                              <AccordionItem value={`item-${docIndex}`}>
                                <AccordionTrigger>
                                  <h3 className="text-xs sm:text-sm md:text-base text-white">
                                    Source {docIndex + 1}
                                  </h3>
                                </AccordionTrigger>
                                <AccordionContent className="mt-2 overflow-wrap break-words">
                                  <ReactMarkdown
                                    linkTarget="_blank"
                                    className="markdown text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed"
                                    remarkPlugins={[remarkGfm]}
                                  >
                                    {doc.pageContent.replace(
                                      /(?<=\S)\n/g,
                                      '  \n',
                                    )}
                                  </ReactMarkdown>
                                </AccordionContent>
                              </AccordionItem>
                            </div>
                          ))}
                        </Accordion>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {loading && (
        <div className="flex items-center justify-center h-32 w-full bg-gray-700/50">
          <div className="flex items-center justify-center max-w-full sm:max-w-4xl overflow-hidden px-2 sm:px-4 w-full">
            <ReactLoading type='balls' color="grey"/>

            {/* <button onClick={handleAbort}>
              <span className={`mt-2 inline-flex items-center rounded-md px-2 py-1 text-xs sm:text-sm font-medium ring-1 ring-inset`}>
                Stop response
              </span>
            </button> */}
            {/* <LoadingDots color="#04d9ff" /> */}
            {/* <ProgressBar className='w-full' completed={progressRate} /> */}

          </div>
        </div>
      )}
    </>
  );
}

export default MessageList;
