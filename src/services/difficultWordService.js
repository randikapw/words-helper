import { fireEvent } from "@testing-library/react";
import { getItemAsJson, getToday, setItemFromJson } from "../utils";
import counterService from "./counterService";
import moment from "moment";

export const lcl_key = "Difficult_Words";
let today = getToday().toISOString();

class IrregularVerbService {

    #wordsMap
    #newWordTemplate = {
        english: "", //
        sinhala: "",
        comment: "",
        attempts: 0,
        score: 0,
        score_e2s:0,
        score_s2e:0,
        date: today
    }

    #lazyCount = 0;
    #lazyCountMax = 5;
    #lazyTimeout = 15000;
    #lazyTimeoutObj;

    constructor() {
        this.getWordsMap();
    }

    getWordsMap() {
        if (!this.#wordsMap) {
            this.#wordsMap = getItemAsJson(lcl_key);
        }
        return this.#wordsMap;
    }

    #prioritySorterOld(b, a) {
        if (a.score > b.score) return 1;
        else if (a.score < b.score) return -1;
        else if (!a.attempts) return 1
        else if (a.attempts < b.attempts) return 1
        else if (a.attempts > b.attempts) return -1
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
            if (isAold)return 1;
            else if (isBold) return -1;
        }
        else if (a.score < b.score) {
            if (isBold)return -1;
            else if (isAold)return 1;
        }
        else if (!a.attempts) return 1
        else if (!b.attempts) return -1
        else if (a.attempts < b.attempts){
            if (isAold)return 1;
            else if (isBold) return -1;
        }
        else if (a.attempts > b.attempts) {
            if (isBold)return -1;
            else if (isAold)return 1;
        }
        else return 0;
    }

    getPrioratizedWordList() {
        today = getToday().toISOString();//moment().toISOString()//.subtract(1, 'days')
        const unsortedWords = Object.values(this.#wordsMap);
        // console.log("unsorted",unsortedWords)
        const sortedWords = unsortedWords.sort(this.#prioritySorter);
        console.log("sorted", sortedWords)
        return sortedWords;
    }

    removeWord(word) {
        delete this.#wordsMap[word.english];
        this.save();
    }

    updateWord(oldWord, newWord) {
        const wordsMap = this.#wordsMap;

        delete wordsMap[oldWord.english];
        newWord = newWord.replace( /\(#\)/g, '\t' );
        console.log(`updating ${newWord}`)
        this.addMany([newWord]);
    }

    scoreAttempt(word, isWrong = false, isFirstAttempt = true, langType) {
        switch (langType) {
            case "english":
                langType = "e2s";
                break;
            default:
                langType = "s2e";
                break;
        }
        const wordObj = this.#wordsMap[word.english];
        let score = wordObj.score || 0;
        let attempts = wordObj.attempts || 0;
        
        if (isFirstAttempt) wordObj.date = today;

        const vTypeKey = `score_${langType}`;
        if (isWrong) {
            const newPoints = isFirstAttempt ? 2 : 1;
            score += newPoints
            wordObj[vTypeKey] += newPoints;
        } else if (isFirstAttempt) { //Answer is correct at firstattempt
            ++attempts;
            if (score > 0) score -= 1;
            if (wordObj[vTypeKey] > 0) wordObj[vTypeKey] -= 1;
        }
        
        this.#wordsMap[word.english] = {...wordObj, score, attempts}
        counterService.countAttempt(lcl_key,isFirstAttempt,isWrong);
        this.saveLazy();
    }

    getCounts() {
       return counterService.getCounts(lcl_key);
    }

    addMany(newWords) {
        const words = this.#wordsMap;
        let newWrdCount = 0;
        newWords.forEach(verbsSet => {
            const lowerWord = verbsSet.trim().toLocaleLowerCase();
            const verbSplit = lowerWord.split("\t");
            if (verbSplit.length !== 3) {
                const msg = `chunk ${verbsSet} doesnot contain 3 words separated by tabs!`
                alert(msg);
                throw new Error(msg);
            }
            const english = verbSplit[0].trim();
            const sinhala = verbSplit[1].trim();
            const comment = verbSplit[2].trim();
            const w = words[english];
            if (!(w && w.english && w.sinhala)) {
                words[english] = {...this.#newWordTemplate, english, sinhala, comment};
                ++newWrdCount
            }
        });
        this.save();
        return newWrdCount;
    }

    save() {
        console.log("saving irregularVerbs data...",this.#wordsMap);
        setItemFromJson(lcl_key,this.#wordsMap);
        this.#lazyCount = 0;
        clearTimeout(this.#lazyTimeoutObj);
        this.#lazyTimeoutObj=null;
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
        setItemFromJson(backupKey,this.#wordsMap);
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
        const valTxts = values.map(v=>`${v.english}\t${v.sinhala}\t${v.comment}`).join("\n");
        return this.getPlainTextImportPrefix() + "\n" + valTxts
    }

}

export default new IrregularVerbService();