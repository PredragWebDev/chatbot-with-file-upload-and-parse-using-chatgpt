import React, { useEffect, useState } from "react";

export const DownLoad_Modal = () => {
    const [resultFiles, setResultFiles] = useState([]);

    const [checkBox, setCheckBox] = useState([]);

    const fetchData = async () => {
        const response = await fetch('/api/resultFiles');
        const data = await response.json();

        setResultFiles(data.resultFiles);
    };

    const makeCheckbox = async () => {
        const temp = resultFiles.map((file, index) => ({
            id: index,
            label: file,
            isChecked: false
        }));

        setCheckBox(temp as never[]);

    }
    useEffect(() => {
        fetchData();
    }, [])

    useEffect (() => {
        makeCheckbox();

    }, [resultFiles])

    const handleCheckboxChange = (event) => {
        const {id, checked} = event.target;

        setCheckBox(prevCheckboxes =>
            prevCheckboxes.map(checkbox => checkbox.id === parseInt(id)
              ? { ...checkbox, isChecked: checked }
              : checkbox
            )
          );
    }
    
    const handleDownload = () => {
        
        console.log("download???");
        checkBox.map(async (box) => {
            if (box.isChecked) {
                // const response = await fetch(`http://localhost:3000/result/${box.label}`);

                // console.log('response????', response);

                // const blob = await response.blob();

                // const url = URL.createObjectURL(blob);
                const url = `/result/${box.label}`
                const link = document.createElement('a');
                link.href = url;
                link.download = box.label;
                link.click();

                // // setTimeout(() => {
                    
                // //     URL.revokeObjectURL(url);
                // // }, 1000);

                // const del = await fetch('/api/download', {
                //     method: 'POST',
                //     headers: {
                //       'Content-Type': 'application/json',
                //     },
                //     body: JSON.stringify({
                //         filename:box.label
                //     }),
                // });
            }
        })
        checkBox.map(async (box) => {
            if (box.isChecked) {
                
                const del = await fetch('/api/download', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        filename:box.label
                    }),
                });
            }
        })
    }
    
    return (
        <div className="w-60 bg-gray-800 text-white grid p-4">
            {checkBox.map((box, index) => {
                return (
                    <label key = {box.id}>
                        <input type="checkbox" id={box.id} checked = {box.isChecked} onChange={handleCheckboxChange} />
                        {box.label}
                    </label>
                )
            })}
            <button className=" mt-4 inline-flex justify-center items-center gap-x-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={handleDownload}
            >
                Download
            </button>
        </div>
    )
};