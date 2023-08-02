import React, { useEffect, useState } from "react";
import { useSpeechSynthesis } from "react-speech-kit";
import difficultWordService from "../services/difficultWordService";
import { useMemo } from "react";

const getLanguageType = (word) => {
    if (!word.sinhala?.trim()) return ["english", "sinhala"];
    if (!word.english?.trim()) return ["sinhala", "english"];

    if (word.score_s2e < word.score_e2s) {
        return ["english", "sinhala"];
    } else if (word.score_s2e > word.score_e2s) {
        return ["sinhala", "english"];
    }
    const r = Math.floor(Math.random() * 4);
    //biasing to english
    if (r > 0) return ["english", "sinhala"];
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
    const [editMode, setEditMode] = useState(null);
    const [index, setIndex] = useState(0);
    const { speak } = useSpeechSynthesis();

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
        const rand = Math.floor(Math.random() * options.length);
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
            speak({ text: getNextWord() });
        } else {
            difficultWordService.scoreAttempt(currentWord, true, isFirstAttempt, currentLangType);
            setIsFirstAttempt(false);
            speak({ text: `Your answer is wrong, please try again,,${currentWord[currentLangType]}` });
        }
        setValue("");

    }

    const onRemove = (key) => {
        difficultWordService.removeWord(key);
        speak({ text: getNextWord() });
    }

    const onEdit = (key, newKey) => {
        difficultWordService.updateWord(key, newKey);
        //setCurrentWord(newKey);
        speak({ text: getNextWord() });
        setEditMode(null);

    }

    const onSearch = (key, soruce) => {
        if (soruce === "madura") window.open(`https://www.maduraonline.com/?find=${key}`, "_blank");
        else window.open(`https://www.google.com/search?q=${key}&oq=${key}`, "_blank");
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

    const DisplayWord = ({ word, displayMore }) => {
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
                ? <div>
                    <textarea
                        value={editMode}
                        onChange={(e) => setEditMode(e.target.value)}
                    ></textarea><span onClick={() => onEdit(word, editMode)}>Update</span>
                    <span> | </span> <span onClick={() => setEditMode(null)}>Cancel</span>
                </div>
                : <div>
                    <span onClick={() => setEditMode(`${word.english}(#)${word.sinhala}(#)${word.comment}`)}>Edit</span>
                    <span> | </span> <span onClick={() => onRemove(word)}>Remove</span>
                    {(displayMore || (currentLangType === "english")) && <>
                    <span> | </span> <span onClick={() => speak({ text: word['english'] })}>Speak (E)</span>
                    </>}
                    <span> | </span> <span onClick={() => onSearch(word['english'])}>Google (E)</span>
                    <span> | </span> <span onClick={() => onSearch(word['english'], "madura")}>Madura (E)</span>
                    <span> | </span> <span onClick={() => onSearch(word[currentLangType])}>Google (S)</span>
                    <span> | </span> <span onClick={() => onSearch(word[currentLangType], "madura")}>Madura (s)</span>
                    {displayMore !== "tsps" && <>
                    <span> | </span> <span onClick={() => difficultWordService.addToTodaySpecials(word)}>TSP</span>
                    </>}
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
            {previousWord && <div>
                <h4>Previous Word</h4>
                <DisplayWord word={previousWord} displayMore={true} />
            </div>
            }
            <DisplayProgress />
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