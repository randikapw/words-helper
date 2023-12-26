import React, { useEffect, useState } from "react";
import { useSpeechSynthesis } from "react-speech-kit";
import { getWords } from "../utils";
import irregularVerbService from "../services/irregularVerbService";

const getVerbType = (word) => {
    if (word && (word.score_v1 || word.score_v2 || word.score_v3)) {
        if (word.score_v1 > word.score_v2){
            if (word.score_v1 > word.score_v3){
                return "v1";
            } 
        } 
        if (word.score_v2 > word.score_v3){
            return "v2";
        } 
        return "v3";
    }
    const r = Math.floor(Math.random() * 3);
    switch (r) {
        case 0:
            return "v1";
        case 1:
            return "v2";
        default:
            return "v3";
    }
}

const IrregularVerbs = () => {
    const [value, setValue] = useState("");
    const [currentWord, setCurrentWord] = useState(null);
    const [currentWordType, setCurrentWordType] = useState(null);
    const [currentEnteredWord, setCurrentEnteredWord] = useState("");
    const [previousWord, setPreviousWord] = useState(null);
    const [showCurrent, setShowCurrent] = useState(false);
    const [isFirstAttempt, setIsFirstAttempt] = useState(true);
    const [editMode, setEditMode] = useState(null);
    const [index, setIndex] = useState(0);
    const { speak } = useSpeechSynthesis();

    const [verbs, setVerbs] = useState([]);

    useEffect(() => {
        const ws = irregularVerbService.getPrioratizedWordList();
        setVerbs(ws);
    }, []);

    useEffect(() => {
        if(verbs.length)getNextWord()
    },[verbs])

    const getNextWord = () => {
        const i = index % verbs.length;
        setIndex(i + 1);
        const newVerb = verbs[i];
        const targetType = getVerbType(newVerb);
        setPreviousWord(currentWord);

        setCurrentWordType(targetType)
        setCurrentWord(newVerb);
        return newVerb[targetType];
    }

    const onEnterPress = (e) => {
        if (e.keyCode == 13 && e.shiftKey == false) {
            e.preventDefault();
            onCheck();
        }
    }

    const onCheck = () => {
        const lclValue = value.trim().toLocaleLowerCase();
        if (lclValue === "l") {
            speak({ text: currentWord[currentWordType] });
            setValue("");
            return;
        }
        if (lclValue === "s") {
            alert(currentWord[currentWordType]);
            setValue("");
            return;
        }


        const {v1,v2,v3} = currentWord;
        const [ov1,ov2,ov3] = lclValue.replace( /\s\s+/g, ' ' ).split(" ");
        if (v1===ov1 && v2 === ov2 && v3 === ov3) {
            irregularVerbService.scoreAttempt(currentWord, false, isFirstAttempt, currentWordType);
            setIsFirstAttempt(true);
            speak({ text: getNextWord() });
            setShowCurrent(false);
        } else {
            irregularVerbService.scoreAttempt(currentWord, true, isFirstAttempt, currentWordType);
            setIsFirstAttempt(false);
            speak({ text: currentWord[currentWordType] });
            setCurrentEnteredWord(lclValue);
            setShowCurrent(true);
        }
        setValue("");

    }

    const onRemove = (key) => {
        irregularVerbService.removeWord(key);
        speak({ text: getNextWord() });
        setShowCurrent(false);
    }

    const onEdit = (key, newKey) => {
        irregularVerbService.updateWord(key, newKey);
        //setCurrentWord(newKey);
        speak({ text: getNextWord() });
        setEditMode(null);

    }

    const onSearch = (key, soruce) => {
        if (soruce === "madura") window.open(`https://www.maduraonline.com/?find=${key}`, "_blank");
        else window.open(`https://www.google.com/search?q=${key}&oq=${key}`, "_blank");
    }

    const DisplayWord = ({ word }) => {
        return <div className="group">
            <h1 >{word && `${word.v1} ${word.v2} ${word.v3}`}</h1>
            {editMode
                ? <div>
                    <textarea
                        value={editMode}
                        onChange={(e) => setEditMode(e.target.value)}
                    ></textarea><span onClick={() => onEdit(word, editMode)}>Update</span>
                    <span> | </span> <span onClick={() => setEditMode(null)}>Cancel</span>
                </div>
                : <div>
                    <span onClick={() => setEditMode(`${word.v1} ${word.v2} ${word.v3}`)}>Edit</span>
                    <span> | </span> <span onClick={() => onRemove(word)}>Remove</span>
                    <span> | </span> <span onClick={() => onSearch(word)}>Google</span>
                    <span> | </span> <span onClick={() => onSearch(word, "madura")}>Madura</span>
                </div>
            }
        </div>
    }

    const DisplayProgress = () => {
        const counts = irregularVerbService.getCounts();
        return <div className="group">
            <span>Current Session: {`${index} / ${verbs.length}`}</span>
            <div>Today: Unique - {counts.uniqueAttempts} Retries - {counts.retries}</div>
        </div>
    }

    return (
        <div className="speech">
            <div className="group">
                <h2>Type the all three verbfroms seperated by spaces with correct spellings</h2>
            </div>
            {showCurrent 
                ? <><DisplayWord word={currentWord}/><div>Word you entered: <span style={{color:"red"}}>{currentEnteredWord}</span></div> </>
                : <div>Type 'L' then Enter to listen the word again or, Type 'S' then Enter to show the word.</div>
            }
            <div className="group">
                <textarea
                    rows="2"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={onEnterPress}
                ></textarea>
            </div>
            <div className="group">
                <button onClick={() => onEnterPress({ keyCode: 13, shiftKey: false, preventDefault: () => { } })}>
                    check
                </button>
                <button onClick={() => speak({ text: currentWord[currentWordType] })}>
                    Listen Again
                </button>
                <button onClick={() => alert(currentWord[currentWordType])}>
                    Show me the word
                </button>
            </div>
            {previousWord && <div className="group">
                <span>Previous Word</span>
                <DisplayWord word={previousWord} />
            </div>
            }
            <DisplayProgress/>
        </div>
    );
};
export default IrregularVerbs;