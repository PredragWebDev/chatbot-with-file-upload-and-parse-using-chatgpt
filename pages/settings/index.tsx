import React, { useState, useEffect, useCallback } from 'react';
import { getItem, setItem } from '@/libs/localStorageKeys';
import { useRouter } from 'next/router';
import { useDropzone } from 'react-dropzone';
import { useKeys } from '@/hooks';
import { OverlapSizeModal, ChunkSizeModal } from '@/components/other';
import {
  ArrowRightIcon,
  CheckIcon,
  QuestionMarkCircleIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid';

import Pattern from './components/Pattern';
import KeyForm from '@/components/keyform/KeyForm';

export default function Settings() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const {
    handleKeyChange,
    handleSubmitKeys,
  } = useKeys();

  const [openAIapiKey, setOpenAIapiKey] = useState<string>('');
  const [pineconeApiKey, setPineconeApiKey] = useState<string>('');
  const [pineconeEnvironment, setPineconeEnvironment] = useState<string>('');
  const [pineconeIndexName, setPineconeIndexName] = useState<string>('');

  const [submitClicked, setSubmitClicked] = useState(false);
  const [namespaceName, setNamespaceName] = useState<string>('');
  const [deleteMessage, setDeleteMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState(false);
  const [error, setError] = useState<{ message: string; customString: string }>(
    {
      message: '',
      customString: '',
    },
  );
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [ingestErrorMessage, setIngestErrorMessage] = useState<string>('');
  const [chunkSize, setChunkSize] = useState<number>(1024);
  const [overlapSize, setOverlapSize] = useState<number>(20);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  const [showChunkSizeModal, setShowChunkSizeModal] = useState<boolean>(false);
  const [showOverlapSizeModal, setShowOverlapSizeModal] =
    useState<boolean>(false);
  const [isToggled, setIsToggled] = useState(false);
  const [selectedValue, setSelectedValue] = useState('complex');
  const router = useRouter();

  const fetchNamespaces = async (openAIapiKey: string, pineconeApiKey: string, pineconeEnvironment: string, pineconeIndexName: string) => {
    try {
      const response = await fetch(`/api/getNamespaces`, {
        headers: {
          'X-Api-Key': pineconeApiKey,
          'X-Index-Name': pineconeIndexName,
          'X-Environment': pineconeEnvironment,
        },
      });
      const data = await response.json();

      if (response.ok) {
        handleSubmitKeys();
        setSubmitClicked(true);
        setNamespaces(data);
        setError({
          customString: '',
          message: '',
        });
      } else {
        setSubmitClicked(false);
        setNamespaces([]);
        console.log(data);
        setError({
          customString: data.message,
          message: '',
        });
      }
    } catch (error: any) {
      console.log(error);
      setSubmitClicked(false);
      setNamespaces([]);
      setError({
        message: error.message,
        customString: 'An error occured while fetching namespaces',
      });
    }
  };

  const onKeyChange = (storageKey:string, keyValue:string) => {
    switch(storageKey) {
      case "openAIapiKey":
        setOpenAIapiKey(keyValue);
        break

      case "pineconeApiKey":
        setPineconeApiKey(keyValue);
        break

      case "pineconeEnvironment":
        setPineconeEnvironment(keyValue);
        break

      case "pineconeIndexName":
        setPineconeIndexName(keyValue);
        break
    }

    handleKeyChange(storageKey, keyValue);
  }

  const handleSubmit = () => {
    setIngestErrorMessage('');
    fetchNamespaces(openAIapiKey, pineconeApiKey, pineconeEnvironment, pineconeIndexName);
  }

  useEffect(() => {
    setError({
      customString: '',
      message: '',
    });
    setSubmitClicked(false);
  }, [openAIapiKey, pineconeApiKey, pineconeEnvironment, pineconeIndexName]);

  useEffect(() => {
    const openAIapiKey = getItem('openAIapiKey') || '';
    const pineconeApiKey = getItem('pineconeApiKey') || '';
    const pineconeEnvironment = getItem('pineconeEnvironment') || '';
    const pineconeIndexName = getItem('pineconeIndexName') || '';

    setOpenAIapiKey(openAIapiKey);
    setPineconeApiKey(pineconeApiKey);
    setPineconeEnvironment(pineconeEnvironment);
    setPineconeIndexName(pineconeIndexName);

    if(openAIapiKey && pineconeApiKey && pineconeEnvironment && pineconeIndexName) {
      fetchNamespaces(openAIapiKey, pineconeApiKey, pineconeEnvironment, pineconeIndexName);
    }
  }, [])

  const handleDelete = async (namespace: string) => {
    try {
      const response = await fetch(
        `/api/deleteNamespace?namespace=${namespace}`,
        {
          method: 'DELETE',
          headers: {
            'X-Api-Key': pineconeApiKey,
            'X-Index-Name': pineconeIndexName,
            'X-Environment': pineconeEnvironment,
          },
        },
      );

      if (response.ok) {
        const updatedNamespaces = namespaces.filter(
          (item) => item !== namespace,
        );
        setNamespaces(updatedNamespaces);
        setDeleteMessage(`${namespace} has been successfully deleted.`);
      } else {
        const data = await response.json();
        console.log(data.error);
      }
    } catch (error: any) {
      console.log(error);
      setError({
        message: error.message,
        customString: 'An error occured trying to delete a namespace',
      });
    }
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    noClick: true,
    noKeyboard: true,
    onDrop: (acceptedFiles: File[]) => {
      setNamespaceName('');
      setUploadStatus(false);
      setUploadMessage('');
      setIngestErrorMessage('');
      setSelectedFiles(acceptedFiles);
    },
    multiple: true,
  });

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append(`myfile${i}`, selectedFiles[i]);
    }

    formData.append('inputMethod', selectedValue);
    try {
      setUploadMessage('Uploading...');
      setUploadStatus(false);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      console.log('response>>>>', response);


      if (response.ok) {
        setUploadStatus(true);
        setUploadMessage('Files uploaded successfully!');
        setError({
          customString: '',
          message: '',
        });
      } else {
        setUploadStatus(false);
        setUploadMessage('');

        const errorData = await response.json();
        setError({
          customString: '',
          message: errorData.error,
        });
      }
    } catch (error: any) {
      setUploadStatus(false);
      setUploadMessage('');
      setError({
        message: error.message,
        customString: 'An error occured trying to upload files',
      });

      setLoading(false);
    }
  };

  const handleIngest = async () => {

    if (!submitClicked) {
      setIngestErrorMessage('Please submit keys.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/consume?namespaceName=${namespaceName}&chunkSize=${chunkSize}&overlapSize=${overlapSize}`,
        {
          method: 'POST',
          headers: {
            'X-OpenAI-Key': openAIapiKey,
            'X-Pinecone-Key': pineconeApiKey,
            'X-Index-Name': pineconeIndexName,
            'X-Environment': pineconeEnvironment,
          },
        },
      );

      console.log('consume response>>>', response);
      
      if (response.ok) {
        const data = await response.json();
        setMessage(data.message);
        setIngestErrorMessage('');

        setTimeout(() => {
          // setMessage('');
        }, 1000);
        // fetchNamespaces(openAIapiKey, pineconeApiKey, pineconeEnvironment, pineconeIndexName);
      } else {
        const errorData = await response.json();
        console.log(errorData);
        
        setIngestErrorMessage(errorData.error);
        setUploadMessage('');
        setUploadStatus(false);
        setNamespaceName(''); 
      }
    } catch (error: any) {
      console.log(error);
      
      setIngestErrorMessage('Error ingesting files');
      setNamespaceName('');
      setUploadMessage('');
      setUploadStatus(false);
    }

    setLoading(false);
  };

  return (
    <div className="relative isolate min-h-screen bg-gray-900">
      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-2">
        <div className="relative px-6 pb-20 pt-8 sm:pt-16 lg:static lg:px-8 lg:py-24">
          <div className="mx-auto max-w-xl lg:mx-0 lg:max-w-lg">
            <Pattern />
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {' '}
              Setting infos
            </h2>
            {error && (
              <div className="mt-4 sm:mt-8 flex justify-center mb-4">
                <div className="text-red-500 text-sm sm:text-base font-semibold">
                  {error.customString}
                </div>
              </div>
            )}

            <div className="max-w-xl mx-auto">
              <div className="gap-4 grid grid-cols1 sm:grid-cols-2 mb-6">
                <KeyForm
                  keyName="OpenAI API Key"
                  keyValue={openAIapiKey}
                  setKeyValue={(key: string) =>
                    onKeyChange('openAIapiKey', key)
                  }
                />
                <KeyForm
                  keyName="Pinecone API Key"
                  keyValue={pineconeApiKey}
                  setKeyValue={(key: string) =>
                    onKeyChange('pineconeApiKey', key)
                  }
                />
                <KeyForm
                  keyName="Pinecone environment"
                  keyValue={pineconeEnvironment}
                  setKeyValue={(key: string) =>
                    onKeyChange('pineconeEnvironment', key)
                  }
                />
                <KeyForm             
                  keyName="Pinecone index name"
                  keyValue={pineconeIndexName}
                  setKeyValue={(key: string) =>
                    onKeyChange('pineconeIndexName', key)
                  }
                />
              </div>
              
              {openAIapiKey &&
                pineconeApiKey &&
                pineconeEnvironment &&
                pineconeIndexName && (
                  <button
                    type="button"
                    className="rounded-md text-white mb-6 mx-auto items-center align-center justify-between flex px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold focus-visible:outline-indigo-500 shadow-sm ring-1 ring-inset bg-indigo-500 hover:bg-indigo-400"
                    onClick={ handleSubmit }
                  >
                    {submitClicked ? (
                      <>
                        Your keys have been submitted
                        <CheckIcon className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      'Submit'
                    )}
                  </button>
                )}

                

              <div className="flex pt-4 border-t border-white justify-between items-center space-x-2 align-center mb-2">
                {namespaces.length > 0 ? (
                  <h2 className="mb-4 text-xl text-center sm:text-3xl sm:text-left font-bold text-white">
                    Your namespaces
                  </h2>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-red-400/10 px-2 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-red-400 ring-1 ring-inset ring-red-400/20">
                    No namespaces found
                  </span>
                )}

                <button
                  type="button"
                  className="rounded-md items-center align-center justify-between flex bg-white px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-200"
                  onClick={() => router.push('/')}
                >
                  Start chatting
                  <ArrowRightIcon
                    className="ml-2 -mr-0.5 h-4 w-4"
                    aria-hidden="true"
                  />
                </button>
              </div>
              
              <ul role="list" className="grid grid-cols-2 gap-4">
                {namespaces.map((namespace) => (
                  <li
                    key={namespace}
                    className="bg-gray-800/60 rounded-lg shadow px-5 py-4 flex items-center justify-between space-x-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {namespace}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center space-x-2">
                      {selectedNamespace === namespace ? (
                        <div className="flex items-center space-x-2">
                          <CheckIcon
                            className="h-5 w-5 text-green-400 hover:text-green-500 cursor-pointer"
                            aria-hidden="true"
                            onClick={() => handleDelete(selectedNamespace)}
                          />
                          <XMarkIcon
                            className="h-5 w-5 text-gray-400 hover:text-gray-300 cursor-pointer"
                            aria-hidden="true"
                            onClick={() => setSelectedNamespace('')}
                          />
                        </div>
                      ) : (
                        <TrashIcon
                          className="h-5 w-5 text-red-400
                        hover:text-red-500 cursor-pointer
                        "
                          aria-hidden="true"
                          onClick={() => setSelectedNamespace(namespace)}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {deleteMessage && (
                <p className="mt-6 text-md font-medium text-green-400 text-center">
                  {deleteMessage}
                </p>
              )}
            </div>
          </div>
        </div>
        {/* ------------------------------- */}
        {/* <div className="px-6 pb-20 pt-8 sm:pt-16 lg:static lg:px-8 lg:py-24"> */}
        <div className="px-6 pb-24 pt-8 sm:pb-32 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-xl lg:mr-0 lg:max-w-lg ">
            {/* upload area */}
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {' '}
              Creating namespaces
            </h2>
            <p className="mt-4 sm:mt-6 text-sm sm:text-lg leading-6 sm:leading-8 text-gray-300">
              {' '}
              Treat namespaces like topics of conversation. You can create as
              many as you like, and they can be used to organize your data.
            </p>

            <h2 className="text-2xl sm:mt-3 text-sm sm:text-lg leading-6 sm:leading-8  font-bold tracking-tight text-white">
              {' '}
              Follow these steps to start chatting
            </h2>
            <h2 className="text-2xl sm:mt-1 text-sm sm:text-lg leading-6 sm:leading-8 tracking-tight text-gray-300">
              {' '}
              1. Submit setting infos.<br></br>
              2. Upload documents(PDF, DOCX, CSV, TXT).<br></br>
              3. Input namespace name.<br></br>
              4. Ingest.<br></br>
              5. Start chatting.
            </h2>

            <div
              className="mt-4 sm:mt-8 flex justify-center"
              {...getRootProps()}
            >
              {' '}
              <label className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-6 sm:p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer">
                {' '}
                <svg
                  className="mx-auto h-8 sm:h-12 w-8 sm:w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8S8 28.418 8 24m32 10v6m0 0v6m0-6h6m-6 0h-6"
                  />
                </svg>
                <input
                  {...getInputProps({
                    onClick: (event) => event.stopPropagation(),
                  })}
                />
                <span className="mt-2 sm:mt-2 block text-xs sm:text-sm font-semibold text-gray-100">
                  {selectedFiles.length > 0
                    ? selectedFiles.map((file) => file.name).join(', ')
                    : 'Drag and drop or click to select files to upload'}
                </span>
              </label>
            </div>
            {/* upload area */}
            <div className="mt-4 sm:mt-8 flex justify-between">
              {/* <button className="rounded-md bg-indigo-500 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 text-center text-sm sm:text-base font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 mr-2"
                onClick={() => setIsToggled(!isToggled)}>
                {isToggled ? 'complex' : 'separate'}
              </button> */}
              <label className='text-white'>
                <input type="radio" className='mr-2' value="complex" checked={selectedValue === 'complex'} onChange={(e) => {setSelectedValue(e.target.value)}} />
                Complex
              </label>

              <label className='text-white'
              >
                <input type="radio" className='mr-2' value="separate" checked={selectedValue === 'separate'} onChange={(e) => {setSelectedValue(e.target.value)}} />
                Separate
              </label>
              <label className='text-white'
              >
                <input type="radio" className='mr-2' value="1-multi" checked={selectedValue === '1-multi'} onChange={(e) => {setSelectedValue(e.target.value)}} />
                1-multi
              </label>
              <button
                className="rounded-md bg-indigo-500 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 text-center text-sm sm:text-base font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                onClick={handleUpload}
              >
                {uploadMessage ? uploadMessage : 'Upload files'}
              </button>
            </div>
            {/* <div>
              <div className="flex items-center">
                <label
                  htmlFor="chunkSize"
                  className="block text-sm font-medium leading-6 text-gray-300"
                >
                  Chunk size
                </label>
                <QuestionMarkCircleIcon
                  className="ml-2 h-5 w-5 text-gray-300 hover:text-gray-400 cursor-pointer"
                  onClick={() => setShowChunkSizeModal(true)}
                />
              </div>

              <div className="w-full">
                <input
                  type="range"
                  min={100}
                  max={4000}
                  step={100}
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  className="w-full"
                />

                <div className="text-center text-gray-100">{chunkSize}</div>
              </div>
            </div> */}

            {/* <ChunkSizeModal
              open={showChunkSizeModal}
              setOpen={setShowChunkSizeModal}
            />
            <div>
              <div className="flex items-center">
                <label
                  htmlFor="overlapSize"
                  className="block text-sm font-medium leading-6 text-gray-300"
                >
                  Overlap size
                </label>
                <QuestionMarkCircleIcon
                  className="ml-2 h-5 w-5 text-gray-300 cursor-pointer hover:text-gray-400"
                  onClick={() => setShowOverlapSizeModal(true)}
                />
              </div>

              <div className="w-full">
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={overlapSize}
                  onChange={(e) => setOverlapSize(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-center text-gray-100">{overlapSize}%</div>
              </div>
            </div>
            <OverlapSizeModal
              open={showOverlapSizeModal}
              setOpen={setShowOverlapSizeModal}
            /> */}

            {uploadStatus && (
              <div className="mt-4 sm:mt-8 grid grid-cols-1 gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold leading-6 text-white"
                  >
                    Namespace name
                  </label>

                  <div className="mt-2.5">
                    <input
                      type="text"
                      className="block w-full rounded-md border-0 bg-white/5 px-2 sm:px-3.5 py-1.5 sm:py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 text-sm sm:text-base sm:leading-6 opacity-50"
                      value={namespaceName}
                      onChange={(e) => {
                        setIngestErrorMessage('');
                        setNamespaceName(e.target.value);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {namespaceName && (
              <div>
                <div className="mt-4 sm:mt-8 flex justify-end">
                  <button
                    className="rounded-md bg-indigo-500 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 text-center text-sm sm:text-base font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                    onClick={handleIngest}
                  >
                    {loading ? 'Ingesting...' : message ? message : 'Ingest'}
                  </button>
                </div>
              </div>
            )}

            {ingestErrorMessage && (
              <div className="mt-2 sm:mt-4 flex justify-end mb-4">
                <div className="text-red-500 text-sm sm:text-base font-semibold">
                  {ingestErrorMessage}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
