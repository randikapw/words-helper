import React, { useCallback, useEffect, useState } from "react";
import { useSpeechSynthesis } from "react-speech-kit";
import difficultWordService from "../services/difficultWordService";
import { useMemo } from "react";
import { CopyText } from "../comp/copyToCipboard";

const getLanguageType = (word) => {
    if (!word.sinhala?.trim()) return ["english", "sinhala"];
    if (!word.english?.trim()) return ["sinhala", "english"];

    if (word.score_s2e < word.score_e2s) {
        return ["english", "sinhala"];
    } else if (word.score_s2e > word.score_e2s) {
        return ["sinhala", "english"];
    }
    const r = Math.floor(Math.random() * 10);
    //always to english
    if (r > -1) return ["english", "sinhala"];
    //biasing to english
    // if (r > 0) return ["english", "sinhala"];
    return ["sinhala", "english"];
    // switch (r) {
    //     case 0:
    //         return ["english", "sinhala"];
    //     default:
    //         return ["sinhala", "english"];
    // }
}

const getOtherOptions = (words, language, optionCount = 3) => {
    const l = words.length;
    const options = [];
    for (let index = 0; index < optionCount; index++) {
        const rand = Math.floor(Math.random() * l);
        options.push(words[rand][language]);
    }
    return options;
}

const DifficultWords = () => {
    const [value, setValue] = useState("");
    const [currentWord, setCurrentWord] = useState(null);
    const [currentLangType, setCurrentLangType] = useState(null);
    const [currentAnswerLangType, setCurrentAnswerLangType] = useState(null);
    const [currentAnswerOptions, setCurrentAnswerOptions] = useState([]);
    const [previousWord, setPreviousWord] = useState(null);
    const [isFirstAttempt, setIsFirstAttempt] = useState(true);
    const [index, setIndex] = useState(0);
    const [spchIndex, setSpchIndex] = useState(6);
    const { speak : speakO, voices } = useSpeechSynthesis();

    const speak = useCallback(({text})=>speakO({text,voice:voices[spchIndex]}),[speakO,voices,spchIndex])

    const [words, setWords] = useState([]);
    const [todaySpecials, setTodaySpecials] = useState([]);

    const [counts, showTSPs] = useMemo(() => {
        const counts = difficultWordService.getCounts();
        const showTSPs = counts > 3;
        return [counts, showTSPs]
    }, [index])

    useEffect(() => {
        const ws = difficultWordService.getPrioratizedWordList();
        setWords(ws);
        setTodaySpecials(difficultWordService.getTodaySpecials());
        setSpchIndex(localStorage.getItem("spchIndex") ?? 1)
    }, []);

    useEffect(() => {
        if (words.length) getNextWord()
    }, [words])

    const getNextWord = () => {
        const i = index % words.length;
        setIndex(i + 1);
        const newWord = words[i];
        const [targetLangType, answerLangType] = getLanguageType(newWord);
        const options = getOtherOptions(words, answerLangType);
        //adding correct answer to random place
        const rand = Math.floor(Math.random() * (options.length + 1));
        options.splice(rand, 0, newWord[answerLangType]);
        setPreviousWord(currentWord);
        setCurrentAnswerOptions(options);
        setCurrentLangType(targetLangType);
        setCurrentAnswerLangType(answerLangType);
        setCurrentWord(newWord);
        return newWord[targetLangType];
    }

    const onEnterPress = (e) => {
        if (e.keyCode == 13 && e.shiftKey == false) {
            e.preventDefault();
            setValue(value + " ");
            setTimeout(() => onCheck(), 1000);
        }
    }

    const onCheck = (choosedWord) => {

        if (currentWord[currentAnswerLangType] === choosedWord) {
            difficultWordService.scoreAttempt(currentWord, false, isFirstAttempt, currentLangType);
            setIsFirstAttempt(true);
            speak({ text: getNextWord()});
        } else {
            difficultWordService.scoreAttempt(currentWord, true, isFirstAttempt, currentLangType);
            setIsFirstAttempt(false);
            speak({ text: `Your answer is wrong, please try again,,${currentWord[currentLangType]}` });
        }
        setValue("");

    }

    const onSearch = (key, soruce) => {
        if (soruce === "madura") return window.open(`https://www.maduraonline.com/?find=${key}`, "_blank");
        if (soruce === "bing") return window.open(`https://www.bing.com/search?q=${key}`, "_blank");
        if (soruce === "trans") return window.open(`https://translate.google.com/details?hl=en&sl=en&tl=si&text=${key}&op=translate`, "_blank");
        
        return window.open(`https://www.google.com/search?q=${key}&oq=${key}`, "_blank");
    }

    const addToTSP = (word) => {
        difficultWordService.addToTodaySpecials(word)
    }

    const DisplayProgress = ({ word, displayMore }) => {
        // const counterTemplate = {
        //     uniqueAttempts: 0,
        //     retries: 0,
        //     firstAttemptSuccess: 0,
        //     reattemptFails: 0
        // }
        // const counts = difficultWordService.getCounts();
        return <div className="group">
            <span>Current Session: {`${index} / ${words.length}`}</span>
            <div>Today: Unique - {counts.uniqueAttempts} Retries - {counts.retries}</div>
        </div>
    }

    const Examples = ({word, onHide}) => {
        const gptTxt = useMemo(() => `give me 3 simple sentences using the word "${word['english']}"`, [word]);
        const [editMode, setEditMode] = useState(word.examples ? false : true);
        const [editText, setEditText] = useState(word.examples ? word.examples : '');

        function onTextChange(value) {
            if (editMode) setEditText(value);
        }

        function onUpdate() {
            difficultWordService.updateExamples(word, editText)
            setEditMode(false)
        }

        return <div>
            {editMode && <div className="options">
                AI ASK: {gptTxt} 
                <CopyText textToCopy={gptTxt}/>
                <span onClick={() => onSearch(gptTxt, "bing")}>Bing</span>
            </div>}
        <textarea
            value={editText}
            rows="3"
            onChange={(e) => onTextChange(e.target.value)}
            className={editMode?'':'examplesView'}
        ></textarea>
        { editMode 
        ?<div className="options">
        <span onClick={onUpdate}>Update Examples</span>
        <span onClick={() => setEditMode(false)}>Cancel</span>
        </div>
        : <div className="options">
            <span onClick={() => setEditMode(true)}>Edit Examples</span>
            <span onClick={onHide}>Hide Examples</span>
            </div>
    }

        </div>
    }

    const DisplayWord = ({ word, displayMore }) => {
        const [editText, setEditText] = useState("");
        const [editMode, setEditMode] = useState(false);
        const [showExamples, setShowExamples] = useState(word?.examples?true:false);

        const onRemove = (key) => {
            difficultWordService.removeWord(key);
            speak({ text: getNextWord() });
        }
    
        const onEdit = (key, newKey) => {
            difficultWordService.updateWord(key, newKey);
            //setCurrentWord(newKey);
            speak({ text: getNextWord() });
            setEditMode(false)
    
        }

        const toggoleShowExamples = () => {setShowExamples(!showExamples)}
        const toggoleEditMode = () => {
            setEditText(`${word.english}(#)${word.sinhala}(#)${word.comment}`);
            setEditMode(!editMode);
        }

        return <div className="group">
            <h1>
                {
                    word && ((displayMore && (displayMore === "tsps" && showTSPs || true))
                        ? `${word["english"]} : ${word["sinhala"]}`
                        : `${word[currentLangType]}`)
                }
            </h1>
            {
                word && displayMore && <span>{word["comment"]}</span>
            }
            {editMode
                ? <div className="options">
                    <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                    ></textarea><span onClick={() => onEdit(word, editText)}>Update</span>
                    <span onClick={toggoleEditMode}>Cancel</span>
                </div>
                : <div >
                    <div className="options">
                    <span onClick={toggoleEditMode}>🖉</span>
                    {(displayMore || (currentLangType === "english")) && <>
                    <span onClick={() => speak({ text: word['english'] })}>🔊(E)</span>
                    </>}
                    <span className={word?.examples?'examplesAvilable':''} onClick={toggoleShowExamples}>{showExamples? 'Hide': word?.examples?'Show':''} Ex</span>
                    <span onClick={() => onSearch(word['english'])}>Google (E)</span>
                    <span onClick={() => onSearch(word['english'], "madura")}>මදුර(E)</span>
                    <span onClick={() => onSearch(word['english'], "trans")}>🌏(E)</span>
                    <span onClick={() => onSearch(word['sinhala'])}>Google (සි)</span>
                    <span onClick={() => onSearch(word['sinhala'], "madura")}>මදුර(සි)</span>
                    {displayMore !== "tsps" && <>
                    <span onClick={() => difficultWordService.addToTodaySpecials(word)}>TSP</span>
                    <span onClick={() => onRemove(word)}>Remove</span>
                    </>}
                    {word && <CopyText textToCopy={word.english} label="Copy(E)"/>}
                    </div>
                    {showExamples && <Examples word={word} onHide={toggoleShowExamples} />}
                </div>
            }
        </div>
    }

    return (
        <div className="speech">
            <div className="group">
                <h2>Choose the correct meaning</h2>
            </div>
            <DisplayWord word={currentWord} />
            {/* <div className="group">
                <textarea
                    rows="10"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={onEnterPress}
                ></textarea>
            </div> */}
            <div className="group">
                {
                    currentAnswerOptions.map((opt) => <button key={opt + Math.random()} onClick={() => onCheck(opt)}>
                        {opt}
                    </button>

                    )
                }

            </div>
            <DisplayProgress />
            {previousWord && <div>
                <h4>Previous Word</h4>
                <DisplayWord word={previousWord} displayMore={true} />
            </div>
            }
            <div>
                <h4>Today Specials</h4>
                {
                    todaySpecials.map((word) => <DisplayWord key={word.english} word={word} displayMore={"tsps"} />)
                }
            </div>
        </div>
    );
};
export default DifficultWords;