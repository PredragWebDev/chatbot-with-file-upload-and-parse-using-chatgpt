import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Bars3Icon, Cog6ToothIcon, InboxArrowDownIcon} from '@heroicons/react/24/outline';
import axios from 'axios';
import {DownLoad_Modal} from '../download/download';
import Modal from '@mui/material/Modal';
import PopupState, { bindTrigger, bindPopover } from 'material-ui-popup-state';
import Popover from '@mui/material/Popover';

interface HeaderProps {
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
  const router = useRouter();
  const handleDownload = async () => {
    const res = await axios.post('/api/download');
    // alert(res.data);
  }
  const [showModal, setShowModal] = useState(false);

  const handleOpenDownLoad_Modal = () => {
    setShowModal(true);
  };

  const handleCloseDownLoad_Modal = () => {
    setShowModal(false);
  }

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-800 bg-gray-900 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 justify-between">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center">
        <span className="flex-1 text-center items-center flex-shrink-0 rounded-md  px-2 py-1 text-xs sm:text-sm md:text-md md:text-lg font-medium text-blue-400">
          Chat with your multiple docs
        </span>
      </div>

      <div className="flex-shrink-0 flex" >
        <button
          onClick={() => router.push('/settings')}
          type="button"
          className="inline-flex items-center gap-x-1.5 mr-3 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <Cog6ToothIcon
            className="-ml-0.5 h-4 w-4 sm:w-5 sm:h-5"
            aria-hidden="true"
          />
          <span>Settings</span>
        </button>
        
        <PopupState variant="popover" popupId="demo-popup-popover">
            {(popupState) => (
                <div>
                    <button {...bindTrigger(popupState)}
                      type="button"
                      className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      // onClick={handleOpenDownLoad_Modal}
                    >
                      <InboxArrowDownIcon
                        className="-ml-0.5 h-4 w-4 sm:w-5 sm:h-5"
                        aria-hidden="true"
                      />
                      DownLoad

                    </button>
                    <Popover
                        {...bindPopover(popupState)}
                        anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                        }}
                        
                    >
                        <DownLoad_Modal/>
                    </Popover>
                </div>
                
            )}
        </PopupState>
        {/* <Modal
            open={showModal}
            style={{position: 'fixed', top:'50px', alignItems:'center', justifyContent:'center'}}
            onClose={() =>setShowModal(false)}
            aria-labelledby="parent-modal-title"
            aria-describedby="parent-modal-description"
        >
            <DownLoad_Modal/>
        </Modal> */}

      </div>
    </div>
  );
};

export default Header;
