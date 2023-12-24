import React, { useState } from "react";
import { useSpeechSynthesis } from "react-speech-kit";
import difficultWordService from "../services/difficultWordService";

const AddDifficultWords = () => {
    const [value, setValue] = useState("");


    const onEnterPress = (e) => {
        if (e.keyCode == 13 && e.shiftKey == false) {
            e.preventDefault();
            let words = difficultWordService.getWordsMap();
            const newWords = value.split('\n');
            let newWrdCount = difficultWordService.addMany(newWords);
            alert(`${newWrdCount} difficult workds imported`);
        }
    }


    return (
        <div className="speech">
            <div className="group">
                <h2>Listdown the words you want to add</h2>
                <span>Ex: englishWord(tab)සිංහලවචනය(tab)Comment     (use excel to prepare data and copy paste here)</span>
            </div>
            <div className="group">
                <textarea
                    rows="10"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={onEnterPress}
                ></textarea>
            </div>
            <div className="group">
                <button onClick={() => onEnterPress({ keyCode: 13, shiftKey: false, preventDefault: () => { } })}>
                    import
                </button>
            </div>
        </div>
    );
};
export default AddDifficultWords;