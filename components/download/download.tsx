import React, { SetStateAction, useEffect, useState } from "react";

export const DownLoad_Modal = (props: { pineconeIndexName: React.SetStateAction<string>; selectedNamespace: any; closeDonwloadModal: () => void; }) => {
    const [resultFiles, setResultFiles] = useState([]);
    
    const [checkBox, setCheckBox] = useState<any[]>([]);
    
    const [pineconeIndexName, setPineconeIndexName] = useState('');
    
    const [selectedValue, setSelectedValue] = useState('time');
    const fetchData = async (sortBy: React.SetStateAction<string>) => {
        // const pineconeIndexName = props.pineconeIndexName;
        setPineconeIndexName(props.pineconeIndexName);
        
        if (props.pineconeIndexName) {

            const response = await fetch('/api/resultFiles', {
                method:'POST',
                headers: {'Content-Type': 'application/json',},
                body: JSON.stringify({
                    pineconeIndexName:props.pineconeIndexName,
                    selectedNamespace:props.selectedNamespace,
                    sortBy:sortBy
                    
                })
            });
            const data = await response.json();
    
            setResultFiles(data.resultFiles);
        }
    };

    const handleSortIndex = (value: React.SetStateAction<string>) => {

        console.log('value>>>', value);
        setSelectedValue(value);
        fetchData(value);
    }

    const makeCheckbox = async () => {
        const temp = resultFiles.map((file, index) => ({
            id: index,
            label: file,
            isChecked: false
        }));

        setCheckBox(temp as never[]);

    }
    useEffect(() => {
        fetchData('time');
    }, [])

    useEffect (() => {
        makeCheckbox();

    }, [resultFiles])

    const handleCheckboxChange = (event: { target: { id: number; checked: boolean; }; }) => {
        const {id, checked} = event.target;

        setCheckBox((prevCheckboxes)=>
            prevCheckboxes.map((checkbox: {id:number} )=> checkbox.id === parseInt(id)
              ? { ...checkbox, isChecked: checked }
              : checkbox
            )
          );
      
    }
    
    const handleDownload = () => {
        
        console.log("download???");
        checkBox.map(async (box) => {
            if (box.isChecked) {

                const url = `/result/${pineconeIndexName}/${props.selectedNamespace}/${box.label}`;
                console.log("url>>>>", url);
                const link = document.createElement('a');
                link.href = url;
                link.download = box.label;
                link.click();

            }
        })
        
        props.closeDonwloadModal();
    }

    const handleDelete = () => {
        checkBox.map(async (box) => {
            if (box.isChecked) {
                
                const del = await fetch('/api/download', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        filename:box.label,
                        pineconeIndexName,
                        selectedNamespace:props.selectedNamespace
                    }),
                });
            }
        })

        props.closeDonwloadModal();
    }
    
    return (
        <div className="w-60 bg-gray-800 text-white grid p-4">

            <div>
                <label className="mr-2"> Sort By :</label>
                <label className='text-white mr-1'>
                    <input type="radio" className='mr-2' value="name" checked={selectedValue === 'name'} onChange={(e) => { handleSortIndex(e.target.value)}} />
                    Name
                </label>
                <label className='text-white'>
                    <input type="radio" className='mr-2' value="time" checked={selectedValue === 'time'} onChange={(e) => { handleSortIndex(e.target.value)}} />
                    Time
                </label>
            </div>
            <div className="border-b-2 mb-2"></div>

            {checkBox.length > 0 ? (
                checkBox.map((box, index) => {
                    return (
                        <label key = {box.id}>
                            <input type="checkbox" id={box.id} checked = {box.isChecked} onChange={handleCheckboxChange} />
                            {box.label}
                        </label>
                    )
                })
            ):(
                'No files'
            )}
            

            <div className=" flex justify-between">
                <button className=" mt-4 inline-flex justify-center items-center gap-x-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    onClick={handleDownload}
                >
                    Download
                </button>
                <button className=" mt-4 inline-flex justify-center items-center gap-x-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    onClick={handleDelete}
                >
                    Delete
                </button>
            </div>
        </div>
    )
};