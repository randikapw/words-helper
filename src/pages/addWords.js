import React, { useState } from "react";
import { useSpeechSynthesis } from "react-speech-kit";
import { getWords } from "../utils";
import wordsService from "../services/wordsService";

const AddWords = () => {
    const [value, setValue] = useState("");


    const onEnterPress = (e) => {
        if (e.keyCode == 13 && e.shiftKey == false) {
            e.preventDefault();
            let words = wordsService.getWordsMap();
            const newWords = value.split('\n');
            let newWrdCount = wordsService.addMany(newWords);
            alert(`${newWrdCount} words imported`);
        }
    }


    return (
        <div className="speech">
            <div className="group">
                <h2>Listdown the words you want to add</h2>
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
export default AddWords;