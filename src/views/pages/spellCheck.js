import React, { useCallback, useEffect, useState } from "react";
import { useSpeechSynthesis } from "react-speech-kit";
import { getWords } from "../utils";
import wordsService from "../services/wordsService";

const SpellCheck = () => {
    const [value, setValue] = useState("");
    const [filter, setFilter] = useState({ status: "ACTIVE" });
    const [currentWord, setCurrentWord] = useState("ready");
    const [currentEnteredWord, setCurrentEnteredWord] = useState("");
    const [previousWord, setPreviousWord] = useState(null);
    const [showCurrent, setShowCurrent] = useState(false);
    const [isFirstAttempt, setIsFirstAttempt] = useState(true);
    const [editMode, setEditMode] = useState(null);
    const [index, setIndex] = useState(1);
    const [repeats, setRepeats] = useState({ current: 1, total: 1 })
    const [spchIndex, setSpchIndex] = useState(6);
    const { speak: speakO, voices } = useSpeechSynthesis();

    const [words, setWords] = useState([]);

    const speak = useCallback(({ text }) => speakO({ text, voice: voices[spchIndex] }), [speakO, voices, spchIndex])
    const setSpeechIndex = useCallback((index) => {
        setSpchIndex(index)
        localStorage.setItem("spchIndex", index)
    }, [])

    useEffect(() => {
        const ws = wordsService.getPrioratizedWordList(filter);
        setWords(ws);
        const currWrd = ws[0]
        setCurrentWord(currWrd);
        setRepeats(wordsService.getRepeatCountsForWord(currWrd))
        setSpchIndex(localStorage.getItem("spchIndex") ?? 1)
    }, []);

    const getNextWord = () => {
        const i = index % words.length;
        setIndex(i + 1);
        const newTxt = words[i];
        setPreviousWord(currentWord);
        setCurrentWord(newTxt);
        setIsFirstAttempt(true);
        setShowCurrent(false);
        setRepeats(wordsService.getRepeatCountsForWord(newTxt))
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
            speak({ text: currentWord });
            setValue("");
            return;
        }
        if (lclValue.startsWith("v ")) {
            const index = parseInt(lclValue.split(" ")[1])
            let message;
            if (index && index >= 1) {
                setSpeechIndex(index - 1)
                message = "The voice has changed"
            } else {
                message = "Invalid voice index"
            }
            setTimeout(() => speak({ text: message }), 500);
            setValue("");
            return;
        }

        if (currentWord.toLocaleLowerCase() === lclValue) {
            const { current, total } = repeats;
            console.log("current", current)
            wordsService.scoreAttempt(currentWord, false, isFirstAttempt, current);
            if (current + 1 < total) { //+1 to reprocent ongoing current attempt
                setRepeats({ ...repeats, current: current + 1 })
                speak({ text: currentWord })
                setShowCurrent(false);
                setIsFirstAttempt(false);
            } else {
                speak({ text: getNextWord() });
            }
        } else {
            wordsService.scoreAttempt(currentWord, true, isFirstAttempt);
            setIsFirstAttempt(false);
            speak({ text: currentWord });
            setCurrentEnteredWord(lclValue);
            setShowCurrent(true);
            const { total } = repeats;
            const increment = total > 9 ? 0 : total > 4 ? 1 : total > 2 ? 2 : 3
            setRepeats({ ...repeats, total: total + increment })
        }
        setValue("");

    }


    const onEdit = (key, newKey) => {
        wordsService.updateWord(key, newKey);
        setCurrentWord(newKey);
        speak({ text: newKey });
        setEditMode(null);

    }

    const onSearch = (key, soruce) => {
        if (soruce === "madura") window.open(`https://www.maduraonline.com/?find=${key}`, "_blank");
        else window.open(`https://www.google.com/search?q=${key}&oq=${key}`, "_blank");
    }

    const DisplayWord = ({ word, isPrevious = false }) => {
        const [status, setStatus] = useState(wordsService.getWordStatus(word))

        const onRemove = (key, isPrevious) => {
            wordsService.removeWord(key);
            // alert(`Word "${key}" has removed from your collection`);
            setStatus(wordsService.getWordStatus(word));
            // const ws = wordsService.getPrioratizedWordList(filter);
            // setWords(ws);
            if (isPrevious) {
                // setPreviousWord(null);
                return
            }
            speak({ text: getNextWord() });
            setShowCurrent(false);
        }


        const onRestore = (key, isPrevious) => {
            wordsService.restoreWord(key);
            // alert(`Word "${key}" has restored to your collection`);
            setStatus(wordsService.getWordStatus(word));
            // const ws = wordsService.getPrioratizedWordList(filter);
            // setWords(ws);
        }



        return <div className="pl-0">

            <h1 className="text-3xl">{word} </h1>
            {status === "DELETE" && <span className="tagLabel bg-red-500">DELETED</span>}
            {status === "ARCHIVED" && <span className="tagLabel bg-yellow-500">{status}</span>}
            {editMode
                ? <div>
                    <textarea
                        value={editMode}
                        onChange={(e) => setEditMode(e.target.value)}
                    ></textarea><span onClick={() => onEdit(word, editMode)}>Update</span>
                    <span> | </span> <span onClick={() => setEditMode(null)}>Cancel</span>
                </div>
                : <div className="options pt-4">

                    {
                        status === "ACTIVE"
                            ? <>
                                <span onClick={() => setEditMode(word)} className="pl-0">Edit</span>
                                <span onClick={() => onRemove(word, isPrevious)}>Delete</span>
                            </>
                            : <span onClick={() => onRestore(word, isPrevious)}>Restore</span>
                    }

                    <span onClick={() => onSearch(word)}>Google</span>
                    <span onClick={() => onSearch(word, "madura")}>Madura</span>
                </div>
            }
        </div>
    }

    const DisplayProgress = () => {
        const counts = wordsService.getCounts();
        return <div className="group">
            <span>Repeats to cover: {`${repeats.total - repeats.current}`}</span>
            <span>|</span>
            <span>Current Session: {`${index} / ${words.length}`}</span>
            <span>|</span>
            <span>Today: Unique - {counts.uniqueAttempts} Retries - {counts.retries}</span>
        </div>
    }

    return (
        <div className="speech">
            <div className="group">
                <h2>Type the word with correct spellings</h2>
            </div>
            {showCurrent
                ? <><DisplayWord word={currentWord} /><div>Word you entered: <span style={{ color: "red" }}>{currentEnteredWord}</span></div> </>
                : <div className="text-sm">Type 'L' then Enter to listen the word again</div>
            }
            <div className="group">
                <textarea
                    rows="2"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={onEnterPress}
                ></textarea>
            </div>
            {/* <div className="group">
                <button onClick={() => onEnterPress({ keyCode: 13, shiftKey: false, preventDefault: () => { } })}>
                    check
                </button>
            </div> */}
            <DisplayProgress />
            {previousWord && <div className="border-y">
                <span>Previous Word</span>
                <DisplayWord word={previousWord} isPrevious={true} />
            </div>
            }
        </div>
    );
};
export default SpellCheck;