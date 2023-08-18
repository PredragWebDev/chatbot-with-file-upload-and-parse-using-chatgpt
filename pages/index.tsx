import React, {
  Fragment,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Document } from 'langchain/document';

import { useChats, useNamespaces, useKeys } from '@/hooks';

import { Dialog } from '@headlessui/react';
import { ConversationMessage, Message } from '@/types';

import { ChatForm, EmptyState, MessageList } from '@/components/main';
import SidebarList from '@/components/sidebar/SidebarList';
import Header from '@/components/header/Header';
import { useRouter } from 'next/router';
import { getItem } from '@/libs/localStorageKeys';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [modelTemperature, setModelTemperature] = useState<number>(0.5);

  const [returnSourceDocuments, setReturnSourceDocuments] =
    useState<boolean>(false);

  const {
    openAIapiKey,
    pineconeApiKey,
    pineconeEnvironment,
    pineconeIndexName,
  } = useKeys();

  const router = useRouter();

  const {
    namespaces,
    selectedNamespace,
    setSelectedNamespace,
    isLoadingNamespaces,
  } = useNamespaces(pineconeApiKey, pineconeIndexName, pineconeEnvironment);

  const {
    chatList,
    selectedChatId,
    setSelectedChatId,
    createChat,
    deleteChat,
    chatNames,
    updateChatName,
    filteredChatList,
    getConversation,
    updateConversation,
  } = useChats(selectedNamespace);

  const userHasNamespaces = namespaces.length > 0;

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<{
    messages: ConversationMessage[];
    pending?: string;
    history: [string, string][];
    pendingSourceDocs?: Document[];
  }>({
    messages: [
      {
        message: 'Hi, what would you like to know about these documents?',
        type: 'apiMessage',
      },
    ],
    history: [],
  });

  function mapConversationMessageToMessage(
    ConversationMessage: ConversationMessage,
  ): Message {
    return {
      ...ConversationMessage,
      sourceDocs: ConversationMessage.sourceDocs?.map((doc: Document) => ({
        pageContent: doc.pageContent,
        metadata: { source: doc.metadata.source },
      })),
    };
  }

  const { messages, history } = conversation;

  const messageBodyRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const fetchChatHistory = useCallback(() => {
    try {
      const conversations = getConversation(selectedChatId);

      if (!conversations || !conversations.messages) {
        console.error('Failed to fetch chat history: No conversations found.');
        return;
      }

      const pairedMessages: [any, any][] = [];
      const data = conversations.messages;

      for (let i = 0; i < data.length; i += 2) {
        pairedMessages.push([data[i], data[i + 1]]);
      }

      setConversation((conversation) => ({
        ...conversation,
        messages: data.map((message: any) => ({
          type: message.type === 'userMessage' ? 'userMessage' : 'apiMessage',
          message: message.message,
          sourceDocs: message.sourceDocs?.map((doc: any) => ({
            pageContent: doc.pageContent,
            metadata: { source: doc.metadata.source },
          })),
        })),
        history: pairedMessages.map(([userMessage, botMessage]: any) => [
          userMessage.message,
          botMessage?.message || '',
        ]),
      }));
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    }
  }, [selectedChatId, getConversation]);

  useEffect(() => {
    messageBodyRef.current?.scrollIntoView({ behavior: "smooth", block: 'end', inline: 'nearest'});
  }, [conversation]);

  useEffect(() => {
    if (selectedNamespace && chatList.length > 0 && !selectedChatId) {
      setSelectedChatId(chatList[0].chatId);
    }
  }, [
    selectedNamespace,
    chatList,
    selectedChatId,
    setSelectedChatId,
    openAIapiKey,
    pineconeApiKey,
    pineconeEnvironment,
    pineconeIndexName,
  ]);

  useEffect(() => {
    if (chatList.length > 0) {
      setSelectedChatId(chatList[chatList.length - 1].chatId);
    }
  }, [
    selectedNamespace,
    setSelectedChatId,
    chatList,
    openAIapiKey,
    pineconeApiKey,
    pineconeEnvironment,
    pineconeIndexName,
  ]);

  useEffect(() => {
    if (selectedChatId) {
      fetchChatHistory();
    }
  }, [
    selectedChatId,
    fetchChatHistory,
    openAIapiKey,
    pineconeApiKey,
    pineconeEnvironment,
    pineconeIndexName,
  ]);

  const controller = new AbortController();
  const signal = controller.signal;

  useEffect(() => {
    textAreaRef.current?.focus();

  }, []);

  function handleAbort() {
    controller.abort();
  }
  async function handleSubmit(e: any) {
    e.preventDefault();
    setError(null);

    if (!query) {
      alert('Please input a question');
      return;
    }

    const question = query.trim();
    setConversation((conversation) => ({
      ...conversation,
      messages: [
        ...conversation.messages,
        {
          type: 'userMessage',
          message: question,
        } as ConversationMessage,
      ],
    }));

    setLoading(true);
    setQuery('');

    const conversation = getConversation(selectedChatId);
    if (
      !openAIapiKey ||
      !pineconeApiKey ||
      !pineconeEnvironment ||
      !pineconeIndexName
    ) {
      console.error('API keys not found.');
      return;
    }

    const filetype = getItem('filetype');
    const isResume = getItem('ischecked');
    
    console.log('file type in index.>>>>', filetype);

    // const type = SidebarList.filetype;
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OpenAI-Key': openAIapiKey,
        'X-Pinecone-Key': pineconeApiKey,
        'X-Pinecone-Environment': pineconeEnvironment,
        'X-Pinecone-Index-Name': pineconeIndexName
      },
      body: JSON.stringify({
        question,
        history: conversation.history,
        selectedChatId,
        selectedNamespace,
        returnSourceDocuments,
        modelTemperature,
        filetype, 
        isResume,
        controller
      }),
    });
    const data = await response.json();
    // console.log('response>>>', data);


    if (data.error) {
      setError(data.error);
      setConversation((prevConversation) => {
        const updatedConversation = {
          ...prevConversation,
          messages: [
            ...prevConversation.messages,
            {
              type: 'apiMessage',
              message: data.error,
              sourceDocs: data.sourceDocuments
                ? data.sourceDocuments.map(
                    (doc: any) =>
                      new Document({
                        pageContent: doc.pageContent,
                        metadata: { source: doc.metadata.source },
                      }),
                  )
                : undefined,
            } as ConversationMessage,
          ],
          history: [
            ...prevConversation.history,
            [question, data.text] as [string, string],
          ],
        };

        updateConversation(selectedChatId, updatedConversation);
        return updatedConversation;
      });
    } else {
      if (data.isBreak) {

        setConversation((prevConversation) => {
          const updatedConversation = {
            ...prevConversation,
            messages: [
              ...prevConversation.messages,
              {
                type: 'apiMessage',
                message: ' You requested too many times. You can resume later. \n but ' + data.text,
                sourceDocs: data.sourceDocuments
                  ? data.sourceDocuments.map(
                      (doc: any) =>
                        new Document({
                          pageContent: doc.pageContent,
                          metadata: { source: doc.metadata.source },
                        }),
                    )
                  : undefined,
              } as ConversationMessage,
            ],
            history: [
              ...prevConversation.history,
              [question, data.text] as [string, string],
            ],
          };
          updateConversation(selectedChatId, updatedConversation);
          return updatedConversation;
        });
      } if (data.isExpired) {
        setConversation((prevConversation) => {
          const updatedConversation = {
            ...prevConversation,
            messages: [
              ...prevConversation.messages,
              {
                type: 'apiMessage',
                message: 'OpenAI API key has expired.',
                sourceDocs: data.sourceDocuments
                  ? data.sourceDocuments.map(
                      (doc: any) =>
                        new Document({
                          pageContent: doc.pageContent,
                          metadata: { source: doc.metadata.source },
                        }),
                    )
                  : undefined,
              } as ConversationMessage,
            ],
            history: [
              ...prevConversation.history,
              [question, data.text] as [string, string],
            ],
          };
          updateConversation(selectedChatId, updatedConversation);
          return updatedConversation;
        });
      }else {
        setConversation((prevConversation) => {
          const updatedConversation = {
            ...prevConversation,
            messages: [
              ...prevConversation.messages,
              {
                type: 'apiMessage',
                message: data.text,
                sourceDocs: data.sourceDocuments
                  ? data.sourceDocuments.map(
                      (doc: any) =>
                        new Document({
                          pageContent: doc.pageContent,
                          metadata: { source: doc.metadata.source },
                        }),
                    )
                  : undefined,
              } as ConversationMessage,
            ],
            history: [
              ...prevConversation.history,
              [question, data.text] as [string, string],
            ],
          };
  
          updateConversation(selectedChatId, updatedConversation);
          return updatedConversation;
        });
      }

    }

    setLoading(false);
    // messageListRef.current?.scrollIntoView({ behavior: "smooth", block: 'end', inline: 'nearest'});
  }

  const handleEnter = (e: any) => {
    if (e.key === 'Enter' && query) {
      handleSubmit(e);
    } else if (e.key == 'Enter') {
      e.preventDefault();
    }
  };

  const nameSpaceHasChats = filteredChatList.length > 0;

  return (
    <>
      <div className="h-full">
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog as="div" onClose={setSidebarOpen}>
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-900/80" />
            </Transition.Child>

            <div className="fixed inset-0 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative flex flex-1 w-full max-w-xs mr-16">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute top-0 flex justify-center w-16 pt-5 left-full">
                      <button
                        type="button"
                        className="-m-2.5 p-2.5"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <span className="sr-only">Close sidebar</span>
                        <XMarkIcon
                          className="w-6 h-6 text-white"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </Transition.Child>
                  <div className="flex flex-col px-6 pb-4 overflow-y-auto bg-gray-900 grow gap-y-5 ring-1 ring-white/10">
                    <div className="flex items-center h-16 shrink-0"></div>
                    <SidebarList
                      createChat={createChat}
                      selectedNamespace={selectedNamespace}
                      setSelectedNamespace={setSelectedNamespace}
                      namespaces={namespaces}
                      filteredChatList={filteredChatList.map(
                        (chat) => chat.chatId,
                      )}
                      selectedChatId={selectedChatId}
                      setSelectedChatId={setSelectedChatId}
                      chatNames={chatNames}
                      updateChatName={updateChatName}
                      deleteChat={deleteChat}
                      returnSourceDocuments={returnSourceDocuments}
                      setReturnSourceDocuments={setReturnSourceDocuments}
                      modelTemperature={modelTemperature}
                      setModelTemperature={setModelTemperature}
                      nameSpaceHasChats={nameSpaceHasChats}
                      isLoadingNamespaces={isLoadingNamespaces}
                    />
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition.Root>

        <div className="hidden h-screen overflow-y-hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          <div className="flex flex-col h-full pb-4 bg-gray-900 border-r border-gray-800 grow">
            <div className="flex items-center h-8 shrink-0"></div>
            <SidebarList
              createChat={createChat}
              selectedNamespace={selectedNamespace}
              setSelectedNamespace={setSelectedNamespace}
              namespaces={namespaces}
              filteredChatList={filteredChatList.map((chat) => chat.chatId)}
              selectedChatId={selectedChatId}
              setSelectedChatId={setSelectedChatId}
              chatNames={chatNames}
              updateChatName={updateChatName}
              deleteChat={deleteChat}
              returnSourceDocuments={returnSourceDocuments}
              setReturnSourceDocuments={setReturnSourceDocuments}
              modelTemperature={modelTemperature}
              setModelTemperature={setModelTemperature}
              nameSpaceHasChats={nameSpaceHasChats}
              isLoadingNamespaces={isLoadingNamespaces}
            />
          </div>
        </div>

        <div className="h-screen lg:pl-72">
          <Header setSidebarOpen={setSidebarOpen} />

          <main className="flex flex-col">
            {selectedNamespace !== '' && nameSpaceHasChats ? (
              <div className="flex-grow pb-36" ref={messageBodyRef}>
                <div className="h-full">
                  <MessageList
                    messages={messages.map(mapConversationMessageToMessage)}
                    loading={loading}
                    messageListRef={messageListRef}
                    handleAbort = {handleAbort}
                  />
                </div>
              </div>
            ) : (
              <EmptyState
                nameSpaceHasChats={nameSpaceHasChats}
                selectedNamespace={selectedNamespace}
                userHasNamespaces={userHasNamespaces}
              />
            )}

            {nameSpaceHasChats && selectedNamespace && (
              <div className="fixed bottom-0 flex justify-center w-full bg-gradient-to-t from-gray-800 to-gray-800/0 lg:pr-72">
                <ChatForm
                  loading={loading}
                  error={error}
                  query={query}
                  textAreaRef={textAreaRef}
                  handleEnter={handleEnter}
                  handleSubmit={handleSubmit}
                  setQuery={setQuery}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
