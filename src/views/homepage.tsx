'use client'

import { useState } from 'react';
import AddWords from './pages/addWords';
import SpellCheck from './pages/spellCheck';
import AddIrregularVerbs from './pages/addIrregularVerbs';
import IrregularVerbs from './pages/illegularVerbs';
import AddDifficultWords from './pages/addDifficultWords';
import DifficultWords from './pages/difficultWords';
import ImportExport from './pages/importExport';
import NavigationLayout from './layouts/navigation-layout/navigation-layout';
function App() {
  const [page, setPage] = useState("spell");

  const BGImport = () => {
    return <div className="group options">
      <button onClick={() => setPage("import")}>Import Speellings</button>
      <button onClick={() => setPage("irr-import")}>Irregular Import</button>
      <button onClick={() => setPage("diff-import")}>Difficult Improt</button>
    </div>
  }


  return (
    <NavigationLayout>
      <div className="App">

        {page === "spell" && <SpellCheck />}
        {page === "import" && <AddWords />}
        {page === "irr-import" && <AddIrregularVerbs />}
        {page === "irr" && <IrregularVerbs />}
        {page === "diff" && <DifficultWords />}
        {page === "diff-import" && <AddDifficultWords />}
        {page === "options" && <ImportExport />}

    <div className='h-8'></div>
        <div className="group options fixed left-0 bottom-0 bg-[#f5f3f3] bg-opacity-[.90] justify-center w-full">
          <button onClick={() => setPage("spell")}>spellings</button>
          {/* <button onClick={()=>setPage("import")}>Import Speellings</button> */}
          <button onClick={() => setPage("irr")}>Irregular</button>
          {/* <button onClick={()=>setPage("irr-import")}>Irregular Import</button> */}
          <button onClick={() => setPage("diff")}>Difficult Words</button>
          {/* <button onClick={()=>setPage("diff-import")}>Difficult Improt</button> */}
          <button onClick={() => setPage("options")}>Options</button>
        </div>
      </div>
    </NavigationLayout>
  );
}
export default App;
