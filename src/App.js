import useDrivePicker from 'react-google-drive-picker';
import './App.css';
import { useEffect } from 'react';

// Need to add URI in Authorized JavaScript origins to use client id.
const G_DRIVE_CLIENT_ID =
  '580450605565-n0lv7b36gk7s5obhgdt95pv3t9fbrkkd.apps.googleusercontent.com';

// Need to add Website restrictions in Set an application restriction to use API KEY.
const G_DRIVE_DEVELOPER_KEY = 'AIzaSyAhzll87qYRhAVZl2sQB_cL3YHmq-CuNHQ';
const G_DRIVE_TOKEN = 'G_DRIVE_TOKEN';

function App() {
  const [openPicker, authResponse] = useDrivePicker();

  useEffect(() => {
    if (authResponse && authResponse.access_token && authResponse.expires_in) {
      sessionStorage.setItem(G_DRIVE_TOKEN, authResponse.access_token);
    }
  }, [authResponse]);

  const getCustomViews = () => {
    if (!window.google || !window.google.picker) return;
    const customViews = [];
    const ggPicker = window.google.picker;
    // Recent tab
    const viewIds = ggPicker.ViewId || [];
    const folderView = new ggPicker.DocsView(viewIds['FOLDERS' || 'folders']);
    if (folderView) {
      folderView.setSelectFolderEnabled(true);
      folderView.setOwnedByMe(true);
      customViews.push(folderView);
    }

    // Recent tab
    // https://stackoverflow.com/questions/50369526/google-file-picker-recent-tab
    const recentView = new ggPicker.DocsView();
    if (recentView) {
      recentView.setLabel('Recent');
      recentView.setOptions({ sortKey: 15 });
      customViews.push(recentView);
    }

    // Shared Drive
    // https://stackoverflow.com/questions/75268380/how-to-show-a-list-of-shared-with-me-files-in-google-picker
    const sharedDriveView = new ggPicker.DocsView();
    if (sharedDriveView) {
      sharedDriveView.setEnableDrives(true);
      customViews.push(sharedDriveView);
    }

    // Shared with me tab
    // const sharedView = new ggPicker.DocsView();
    // if (sharedView) {
    //   sharedView.setOwnedByMe(false);
    //   customViews.push(sharedView);
    // }

    return customViews;
  };

  const handleOpenPicker = () => {
    const config = {
      clientId: G_DRIVE_CLIENT_ID,
      developerKey: G_DRIVE_DEVELOPER_KEY,
      viewId: 'DOCS',
      disableDefaultView: true,
      showUploadView: false,
      showUploadFolders: false,
      supportDrives: true,
      multiselect: true,
      setSelectFolderEnabled: true,
      customScopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
      customViews: getCustomViews(),
      callbackFunction: (data) => {
        if (data.action === 'loaded') {
          console.info('Opened popup');
          return;
        } else if (data.action === 'cancel') {
          console.info('User clicked cancel/close button');
          return;
        }
        if (data.docs[0]?.type === 'folder') {
          // is select folder
          handleGetFilesInFolder(data.docs);
        } else {
          handleShowList(data.docs);
        }
      },
    };

    if (authResponse?.access_token || sessionStorage.getItem(G_DRIVE_TOKEN)) {
      config.token =
        authResponse?.access_token || sessionStorage.getItem(G_DRIVE_TOKEN);
    }
    openPicker(config);
  };

  const handleGetFilesInFolder = async (folders = []) => {
    const files = await getFileList(folders);
    handleShowList(files);
  };

  async function getFileList(folders = [], folderName = '') {
    let files = [];

    for (let folder of folders) {
      const url = `https://www.googleapis.com/drive/v3/files?q='${folder.id}'+in+parents and trashed%3Dfalse&key=${G_DRIVE_DEVELOPER_KEY}`;
      const { data } = await fetch(
        {
          method: 'get',
          url,
          headers: {
            Authorization: `Bearer ${
              authResponse?.access_token || sessionStorage.getItem(G_DRIVE_TOKEN)
            }`,
          },
        },
        true
      );
      for (let i = 0; i < (data.files || []).length; i++) {
        const file = data.files[i];
        if (file.mimeType.includes('folder')) {
          const childFiles = await getFileList(
            [file],
            `${folderName || folder.name}#${file.name}`
          );
          files = files.concat(childFiles);
        } else {
          files.push({ ...file, folderName: folderName || folder.name });
        }
      }
    }

    return files;
  }

  const handleShowList = (files) => {
    console.log(files);
  };

  return (
    <div className="App">
      <button onClick={handleOpenPicker} className="primary-button"> Open Google Picker</button>
    </div>
  );
}

export default App;
