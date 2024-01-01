import { convertStringToJson, getItemFromLocalStorageAsJson, getToday, setItemFromJson } from "../utils";
import counterService from "./counterService";
import moment from "moment";
import userService, { getNewUserSeviceInstance } from "./userService";

// export const lcl_key = "Irregular_Verbs";
export const lcl_key = "irregular";
let today = getToday().toISOString();

class IrregularVerbService {
    #wordsMap
    #newWordTemplate = {
        v1: "", //
        v2: "",
        v3: "",
        attempts: 0,
        score: 0,
        score_v1: 0,
        score_v2: 0,
        score_v3: 0,
        date: today
    }

    #lazyCount = 0;
    #lazyCountMax = 15;
    #lazyTimeout = 45000;
    #lazyTimeoutObj;

    constructor() {
        this.#wordsMap = {};
        userService.subscribeOnUpdateUser((user) => {
            this.#wordsMap = convertStringToJson(user[lcl_key]);
        })
    }

    getWordsMap() {
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
        // console.log("unsorted",unsortedWords)
        const sortedWords = unsortedWords.sort(this.#prioritySorter);
        console.log("sorted", sortedWords)
        return sortedWords;
    }

    removeWord(word) {
        delete this.#wordsMap[word.v1];
        this.save();
    }

    async updateWord(oldWord, newWord) {
        const wordsMap = this.#wordsMap;

        if (oldWord.v1 !== newWord.split(" ")[0]) { // newWord.split(" ")[0] is for v1
            delete wordsMap[oldWord.v1];
            const rootUserService = getNewUserSeviceInstance();
            const rootUsr = await rootUserService.loadUser("root");
            // const words = this.#wordsMap;
            const rootWords = convertStringToJson(rootUsr[lcl_key]);
            delete rootWords[oldWord.v1];
            await rootUserService.upadteUserAttributes({[lcl_key]:JSON.stringify(rootWords)})
        }
        
        newWord = newWord.replace(/\s+/g, '\t');
        console.log(`irregular updating ${newWord}`)
        await this.addMany([newWord]);
    }

    // #reduceByWieght(marks) {
    //     // if (marks < 1) return marks;
    //     // if (--marks < 5) return marks;
    //     // if (--marks < 10) return marks;
    //     // if (--marks < 20) return marks;
    //     return --marks;
    // }

    getRepeatCountsForWord(word) {
        const { score = 0 } = this.#wordsMap[word.v1] ?? {};
        const total = score > 20 ? 5 : score > 10 ? 4 : score > 5 ? 3 : score > 2 ? 2 : 0
        return { total, current: 0 }
    }

    scoreAttempt(word, isWrong = false, isFirstAttempt = true, vType, currentRepeatAttempt = 0) {
        const wordObj = this.#wordsMap[word.v1];
        let score = wordObj.score || 0;
        let attempts = wordObj.attempts || 0;

        if (isFirstAttempt) wordObj.date = today;

        const vTypeKey = `score_${vType}`;
        if (isWrong) {
            const newPoints = isFirstAttempt ? 2 : 1;
            score += newPoints
            wordObj[vTypeKey] += 1;
        } else {
            if (isFirstAttempt) { //if correct AND first attempt
                ++attempts;
                if (score > 0) --score //score = this.#reduceByWieght(score);
                if (wordObj[vTypeKey] > 1) wordObj[vTypeKey] -= 2 //this.#reduceByWieght(wordObj[vTypeKey]);
                else if (wordObj[vTypeKey] > 0) wordObj[vTypeKey] = 0
            }
            if (currentRepeatAttempt && currentRepeatAttempt%2===0) {
                if (score > 0) score -= 1;
                if (wordObj[vTypeKey] > 0) wordObj[vTypeKey] = wordObj[vTypeKey]  - 1;
            }
        }

        this.#wordsMap[word.v1] = { ...wordObj, score, attempts }
        if (!currentRepeatAttempt || isWrong) counterService.countAttempt(lcl_key, isFirstAttempt, isWrong);
        this.saveLazy();
    }

    getCounts() {
        return counterService.getCounts(lcl_key);
    }

    async addMany(newWords) {

        const rootUserService = getNewUserSeviceInstance();
        const rootUsr = await rootUserService.loadUser("root");
        const words = convertStringToJson(rootUsr[lcl_key]);  //this.#wordsMap 
        let newWrdCount = 0;
        newWords.forEach(verbsSet => {
            const lowerWord = verbsSet.trim();
            const verbSplit = lowerWord.split("\t");
            if (verbSplit.length !== 3) {
                const msg = `chunk ${verbsSet} doesnot contain 3 words separated by tabs!`
                alert(msg);
                throw new Error(msg);
            }
            const v1 = verbSplit[0].trim();
            const v2 = verbSplit[1].trim();
            const v3 = verbSplit[2].trim();
            let w = words[v1];
            if (!(w && w.v2===v2 && w.v3===v3)) {
                w = { ...this.#newWordTemplate, v1, v2, v3 };
                words[v1] = w;
                this.#wordsMap[v1] = w
                ++newWrdCount
            } 
        });
        if (newWrdCount) {
            await rootUserService.upadteUserAttributes({[lcl_key]:JSON.stringify(words)})
            await this.save();
        }
        return newWrdCount;
    }

    async save() {
        console.log("saving irregularVerbs data...", this.#wordsMap);
        // setItemFromJson(lcl_key,this.#wordsMap);
        await userService.upadteUserAttributes({ [lcl_key]: JSON.stringify(this.#wordsMap) })
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

    resetScore(json) {
        Object.values(json).forEach((word) => {
            word.attempts = 0
            word.score = 0;
            word.score_v1 = 0;
            word.score_v2 = 0;
            word.score_v3 = 0;
        })
    }

    // importFromJson(json) {
    //     this.backupJson();
    //     //Verify for valid json
    //     JSON.stringify(json)
    //     this.#wordsMap = json;
    //     this.save();
    // }

    importFromPlainText(value) {
        const newWords = value.split('\n');
        const prf = this.getPlainTextImportPrefix()
        if (newWords.shift()?.includes(prf)) {
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
        const valTxts = values.map(v => `${v.v1}\t${v.v2}\t${v.v3}`).join("\n");
        return this.getPlainTextImportPrefix() + "\n" + valTxts
    }


}

export default new IrregularVerbService();