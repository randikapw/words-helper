import { convertStringToJson, getItemFromLocalStorageAsJson, getToday, setItemFromJson } from "../utils";
import counterService from "./counterService";
import moment from "moment";
import userService from "./userService";

// export const lcl_key = "Spellings";
export const lcl_key = "spellings";
let today = getToday().toISOString();

class WordService {
    #wordsMap
    #newWordTemplate = {
        word: "",
        attempts: 0,
        score: 0,
        date: today
    }

    #lazyCount = 0;
    #lazyCountMax = 5;
    #lazyTimeout = 30000;
    #lazyTimeoutObj;

    constructor() {
        this.#wordsMap = {};
        userService.subscribeOnUpdateUser((user)=>{
            console.log(user[lcl_key])
            this.#wordsMap = convertStringToJson(user[lcl_key]);
        })
    }

    getWordsMap() {
        return this.#wordsMap;
    }

    #prioritySorterOld(b, a) {
        const isAold = moment(a.date).isBefore(today);
        const isBold = moment(b.date).isBefore(today);
        if (isAold && a.score > b.score) return 1;
        else if (isBold && a.score < b.score) return -1;
        else if (!a.attempts) return 1
        else if (!b.attempts) return -1
        else if (isAold && a.attempts < b.attempts) return 1
        else if (isBold && a.attempts > b.attempts) return -1
        else return 0;
    }

    #prioritySorter(b, a) {

        let isAold = moment(a.date).isBefore(today);
        let isBold = moment(b.date).isBefore(today);

        if (!(isAold || isBold)) {
            // if both are attempted recenlty ignoring
            // the recent attmpt impact from next logics
            isAold = true;
            isBold = true;
        }

        if (a.score > b.score) {
            if (isAold) return 1;
            else if (isBold) return -1;
        }
        else if (a.score < b.score) {
            if (isBold) return -1;
            else if (isAold) return 1;
        }
        else if (!a.attempts) return 1
        else if (!b.attempts) return -1
        else if (a.attempts < b.attempts) {
            if (isAold) return 1;
            else if (isBold) return -1;
        }
        else if (a.attempts > b.attempts) {
            if (isBold) return -1;
            else if (isAold) return 1;
        }
        else return 0;
    }

    getPrioratizedWordList() {
        today = getToday().toISOString();
        const unsortedWords = Object.values(this.#wordsMap);
        console.log("unsorted", unsortedWords)
        const sortedWords = unsortedWords.sort(this.#prioritySorter);
        console.log("sorted", sortedWords)
        return sortedWords.map(wrdObj => wrdObj.word);
    }

    removeWord(word) {
        delete this.#wordsMap[word];
        this.save();
    }

    updateWord(oldWord, newWord) {
        const wordsMap = this.#wordsMap;

        delete wordsMap[oldWord];

        newWord = newWord.trim();
        if (!wordsMap[newWord]) {
            wordsMap[newWord] = { ...this.#newWordTemplate, word: newWord }
        }

        this.save();
    }

    scoreAttempt(word, isWrong = false, isFirstAttempt = true) {
        const wordObj = this.#wordsMap[word];
        let score = wordObj.score || 0;
        let attempts = wordObj.attempts || 0;
        let date = wordObj.date;

        if (isFirstAttempt) {
            date = today;
            if (!isWrong) ++attempts;
        }

        if (isWrong) {
            score += (isFirstAttempt ? 2 : 1)
        } else if (isFirstAttempt && score > 0) {
            score -= 1;
            if(score > 5) score -= 1;
            if(score > 10) score -= 1;
            if(score > 20) score -= 1;
        }
        // if(!isFirstAttempt) alert("next attempt");
        this.#wordsMap[word] = { ...wordObj, score, attempts, date }
        counterService.countAttempt(lcl_key, isFirstAttempt, isWrong);
        this.saveLazy();
    }

    getCounts() {
        return counterService.getCounts(lcl_key);
    }

    addMany(newWords) {
        const words = this.#wordsMap;
        let newWrdCount = 0;
        newWords.forEach(word => {
            const lowerWord = word.trim().toLocaleLowerCase();
            if (!words[lowerWord]) {
                words[lowerWord] = { ...this.#newWordTemplate, word: lowerWord };
                ++newWrdCount
            }
        });
        this.save();
        return newWrdCount;
    }

    save() {
        console.log("saving wordsMap data...", this.#wordsMap);
        // setItemFromJson(lcl_key, this.#wordsMap);
        userService.upadteUserAttributes({[lcl_key]:JSON.stringify(this.#wordsMap)})
        this.#lazyCount = 0;
        clearTimeout(this.#lazyTimeoutObj);
        this.#lazyTimeoutObj = null;
    }

    saveLazy() {
        if (++this.#lazyCount > this.#lazyCountMax) {
            this.save();
        } else if (!this.#lazyTimeoutObj) {
            this.#lazyTimeoutObj = setTimeout(() => this.save(), this.#lazyTimeout);
        }
    }

    exportJson() {
        return this.#wordsMap;
    }


    backupJson() {
        const backupKey = `back_${lcl_key}_${moment().toString()}`;
        setItemFromJson(backupKey, this.#wordsMap);
        console.log("#databackup on key: " + backupKey);
    }

    importFromJson(json) {
        this.backupJson();
        //Verify for valid json
        JSON.stringify(json)
        this.#wordsMap = json;
        this.save();
    }

    importFromPlainText(value) {
        const newWords = value.split('\n');
        const prf = this.getPlainTextImportPrefix()
        if(newWords.shift()?.includes(prf)) {
            let newWrdCount = this.addMany(newWords);
            alert(`${newWrdCount} ${lcl_key} imported`);
        } else {
            alert(`Import failed: prefix not found '${prf}'`);
        }
    }

    getPlainTextImportPrefix() {
        return `###${lcl_key}###`
    }

    exportToPlainText() {
        const values = Object.values(this.#wordsMap);
        const valTxts = values.map(v=>v.word).join("\n");
        return this.getPlainTextImportPrefix() + "\n" + valTxts
    }

}

export default new WordService();