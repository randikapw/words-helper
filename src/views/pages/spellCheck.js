import React, { useCallback, useEffect, useState } from "react";
import { useSpeechSynthesis } from "react-speech-kit";
import { getWords } from "../utils";
import wordsService from "../services/wordsService";

const SpellCheck = () => {
    const [value, setValue] = useState("");
    const [currentWord, setCurrentWord] = useState("ready");
    const [currentEnteredWord, setCurrentEnteredWord] = useState("");
    const [previousWord, setPreviousWord] = useState(null);
    const [showCurrent, setShowCurrent] = useState(false);
    const [isFirstAttempt, setIsFirstAttempt] = useState(true);
    const [editMode, setEditMode] = useState(null);
    const [index, setIndex] = useState(1);
    const [spchIndex, setSpchIndex] = useState(6);
    const { speak : speakO, voices } = useSpeechSynthesis();

    const [words, setWords] = useState([]);

    const speak = useCallback(({text})=>speakO({text,voice:voices[spchIndex]}),[speakO,voices,spchIndex])
    const setSpeechIndex = useCallback((index)=>{
        setSpchIndex(index)
        localStorage.setItem("spchIndex",index)
    },[])

    useEffect(() => {
        const ws = wordsService.getPrioratizedWordList();
        setWords(ws);
        const currWrd = ws[0]
        setCurrentWord(currWrd);
        setSpchIndex(localStorage.getItem("spchIndex") ?? 1)
    }, []);

    const getNextWord = () => {
        const i = index % words.length;
        setIndex(i + 1);
        const newTxt = words[i];
        setPreviousWord(currentWord);
        setCurrentWord(newTxt);
        return newTxt;
    }

    const onEnterPress = (e) => {
        if (e.keyCode == 13 && e.shiftKey == false) {
            e.preventDefault();
            onCheck();
        }
    }

    const onCheck = () => {
        const lclValue = value.trim().toLocaleLowerCase();
        if (!(lclValue) || lclValue === "l") {
            speak({ text: currentWord});
            setValue("");
            return;
        }
        if (lclValue.includes("v")) {
            const index = parseInt(lclValue.split(" ")[1])
            let message;
            if (index && index >= 1 ) {
                setSpeechIndex(index-1)
                message = "The voice has changed"
            } else {
                message = "Invalid voice index"
            }
            setTimeout(() => speak({ text: message}), 500);
            setValue("");
            return;
        }

        if (currentWord.toLocaleLowerCase() === lclValue) {
            wordsService.scoreAttempt(currentWord,false,isFirstAttempt);
            setIsFirstAttempt(true);
            speak({ text: getNextWord() });
            setShowCurrent(false);
        } else {
            wordsService.scoreAttempt(currentWord,true,isFirstAttempt);
            setIsFirstAttempt(false);
            speak({ text: currentWord });
            setCurrentEnteredWord(lclValue);
            setShowCurrent(true);
        }
        setValue("");

    }

    const onRemove = (key) => {
        wordsService.removeWord(key);
        speak({ text: getNextWord() });
        setShowCurrent(false);
    }
    
    const onEdit = (key, newKey) => {
        wordsService.updateWord(key,newKey);
        setCurrentWord(newKey);
        speak({ text: newKey });
        setEditMode(null);
               
    }

    const onSearch = (key, soruce) => {
        if (soruce === "madura") window.open(`https://www.maduraonline.com/?find=${key}`, "_blank");
        else window.open(`https://www.google.com/search?q=${key}&oq=${key}`, "_blank");
    }

    const DisplayWord = ({word}) => {
        return <div className="group">
            <h1 >{word}</h1>
            {editMode
                ? <div>
                    <textarea
                        value={editMode}
                        onChange={(e) => setEditMode(e.target.value)}
                    ></textarea><span onClick={() => onEdit(word, editMode)}>Update</span>
                    <span> | </span> <span onClick={() => setEditMode(null)}>Cancel</span>
                </div>
                : <div>
                    <span onClick={() => setEditMode(word)}>Edit</span>
                    <span> | </span> <span onClick={() => onRemove(word)}>Remove</span>
                    <span> | </span> <span onClick={() => onSearch(word)}>Google</span>
                    <span> | </span> <span onClick={() => onSearch(word, "madura")}>Madura</span>
                </div>
            }
        </div>
    }

    const DisplayProgress = () => {
        const counts = wordsService.getCounts();
        return <div className="group">
            <span>Current Session: {`${index} / ${words.length}`}</span>
            <div>Today: Unique - {counts.uniqueAttempts} Retries - {counts.retries}</div>
        </div>
    }

    return (
        <div className="speech">
            <div className="group">
                <h2>Type the word with correct spellings</h2>
            </div>
            {showCurrent 
                ? <><DisplayWord word={currentWord}/><div>Word you entered: <span style={{color:"red"}}>{currentEnteredWord}</span></div> </>
                : <div>Type 'L' then Enter to listen the word again</div>
            }
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
                    check
                </button>
            </div>
            {previousWord && <div className="group">
                <span>Previous Word</span>
                <DisplayWord word={previousWord}/>
            </div>
            }
            <DisplayProgress/>
        </div>
    );
};
export default SpellCheck;