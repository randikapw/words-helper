import { convertStringToJson, getItemFromLocalStorageAsJson, getToday, setItemFromJson } from "../utils";
import counterService from "./counterService";
import moment from "moment";
import userService, { getNewUserSeviceInstance } from "./userService";

// export const lcl_key = "Spellings";
export const lcl_key = "spellings";

const AUTO_ARC_SUCCESS_STREAK = 3;
const AUTO_ARC_SUCCESS_ATMPTS = 3;
const AUTO_ARC_SUCCESS_RATIO = 0.8;
const AUTO_ARC_MAX_SOCRE = 5;

let today = getToday().toISOString();

class WordService {
    #wordsMap
    #newWordTemplate = {
        word: "",
        uniqueAttempts: 0,
        score: 0,
        date: today,
        status: "ACTIVE",
        firstAttepmtSuccess: 0,
        firstAttepmtSuccessStreak: 0,
    }

    #lazyCount = 0;
    #lazyCountMax = 15;
    #lazyTimeout = 45000;
    #lazyTimeoutObj;

    constructor() {
        this.#wordsMap = {};
        userService.subscribeOnUpdateUser((user) => {
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
        else if (!a.firstAttepmtSuccess) return 1
        else if (!b.firstAttepmtSuccess) return -1
        else if (isAold && a.firstAttepmtSuccess < b.firstAttepmtSuccess) return 1
        else if (isBold && a.firstAttepmtSuccess > b.firstAttepmtSuccess) return -1
        else return 0;
    }

    #prioritySorter(b, a) {

        let isAold = moment(a.date).isBefore(today);
        let isBold = moment(b.date).isBefore(today);
        const attemptsA = a.firstAttepmtSuccess || a.attempts
        const attemptsB = b.firstAttepmtSuccess || b.attempts

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
        else if (!attemptsA) return 1
        else if (!attemptsB) return -1
        else if (attemptsA < attemptsB) {
            if (isAold) return 1;
            else if (isBold) return -1;
        }
        else if (attemptsA > attemptsB) {
            if (isBold) return -1;
            else if (isAold) return 1;
        }
        else return 0;
    }

    #getFilteredWordList(filter) {
        let fWordsList = Object.values(this.#wordsMap);
        if (filter) {
            const filters = [];
            if (filter.status) {
                filters.push((word) => {
                    return word.status === filter.status
                })
            }

            const dofilter = (word) => {
                if (!word.status) word.status = "ACTIVE"
                if (filters.length) {
                    // call each funtion set to filters array and check the word fullfills the match
                    for (let i = 0; i < filters.length; i++) {
                        const func = filters[i];
                        if(!func(word)) return false;
                    }

                }
                return true;
            }

            fWordsList = fWordsList.filter(dofilter)

        }
        return fWordsList;
    }

    getPrioratizedWordList(filter) {
        today = getToday().toISOString();
        const unsortedWords = this.#getFilteredWordList(filter);
        console.log("unsorted", unsortedWords)
        const sortedWords = unsortedWords.sort(this.#prioritySorter);
        console.log("sorted", sortedWords)
        return sortedWords.map(wrdObj => wrdObj.word);
    }

    removeWord(word) {
        this.#wordsMap[word].status = "DELETE";
        this.save();
    }

    restoreWord(word) {
        const w = this.#wordsMap[word];
        w.status = "ACTIVE";
        //If it was archived by streak reduce it by to auto archive again in next attempt
        if (w.firstAttepmtSuccessStreak > AUTO_ARC_SUCCESS_STREAK) w.firstAttepmtSuccessStreak = AUTO_ARC_SUCCESS_STREAK - 2
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

    getWordStatus(word) {
        return this.#wordsMap[word].status
    }

    getRepeatCountsForWord(word) {
        const { score = 0 } = this.#wordsMap[word] ?? {};
        const total = score > 20 ? 10 : score > 10 ? 5 : score > 5 ? 3 : 0
        return { total, current: 0 }
    }

    scoreAttempt(word, isWrong = false, isFirstAttempt = true, currentRepeatAttempt = 0) {
        const wordObj = this.#wordsMap[word];
        // let score = wordObj.score || 0;
        // let date = wordObj.date;
        // let status = wordObj.status
        let {firstAttepmtSuccess=0,firstAttepmtSuccessStreak=0,score=0,status,date} = wordObj
        let uniqueAttempts = wordObj.uniqueAttempts ||  wordObj.attempts || 0;  // wordObj.attempts is the old attribute and now it replaced with uniqueAttempts

        if (isWrong) {
            score += (isFirstAttempt ? 3 : 2) //actually this will be again becomes 2 : 1 as two repeats of given for a wrong attempt will reduce one mark. 
        } else if (score > 0) {
            if (isFirstAttempt) score -= 1;
            //now it deduced with repeats
            // if(score > 5) score -= 1;
            // if(score > 10) score -= 1;
            // if(score > 20) score -= 1;
            if (currentRepeatAttempt && currentRepeatAttempt % 2 === 0) score -= 1;
            //didnt optimize with the purpose of increase the readability
        }

        if (isFirstAttempt) {
            ++uniqueAttempts
            date = today;
            if (!isWrong) {
                ++firstAttepmtSuccess;
                ++firstAttepmtSuccessStreak
                // if the there less score and good first attempt streak or if there good first attmpt success to unique attemps ratio, the word will auto archived.
                if( score < AUTO_ARC_MAX_SOCRE &&
                    (firstAttepmtSuccessStreak > AUTO_ARC_SUCCESS_STREAK || 
                        (firstAttepmtSuccess > AUTO_ARC_SUCCESS_ATMPTS && (firstAttepmtSuccess/uniqueAttempts) > AUTO_ARC_SUCCESS_RATIO ) 
                    )
                ) status = "ARCHIVED"
            } else {
                firstAttepmtSuccessStreak = 0;
            }
        } 

        // if(!isFirstAttempt) alert("next attempt");
        this.#wordsMap[word] = { ...wordObj, score, uniqueAttempts, date, firstAttepmtSuccess, firstAttepmtSuccessStreak, status }
        //same word repeating as not counting if the repeat attmpt is correct.
        if (!currentRepeatAttempt || isWrong) counterService.countAttempt(lcl_key, isFirstAttempt, isWrong);
        this.saveLazy();
    }

    getCounts() {
        return counterService.getCounts(lcl_key);
    }

    async addMany(newWords) {
        const rootUserService = getNewUserSeviceInstance();
        const rootUsr = await rootUserService.loadUser("root");
        // const words = this.#wordsMap;
        const rootWords = convertStringToJson(rootUsr[lcl_key]);
        let newWrdCount = 0;
        let existWords = false
        newWords.forEach(word => {
            const lowerWord = word.trim().toLocaleLowerCase();
            let w = rootWords[lowerWord]
            if (!w) {
                w = { ...this.#newWordTemplate, word: lowerWord };
                rootWords[lowerWord] = w
                this.#wordsMap[lowerWord] = { ...w }
                ++newWrdCount
            } else {
                let ew = this.#wordsMap[lowerWord]
                if (!ew) {
                    ew = { ...w }
                    this.#wordsMap[lowerWord] = ew
                }
                ew.score += 5
                ew.status = "ACTIVE"
                existWords = true
            }
        });
        if (existWords) await this.save();
        await rootUserService.upadteUserAttributes({ [lcl_key]: JSON.stringify(rootWords) })
        return newWrdCount;
    }

    async save() {
        console.log("saving wordsMap data...", this.#wordsMap);
        // setItemFromJson(lcl_key, this.#wordsMap);
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
            word.uniqueAttempts = 0
            word.firstAttepmtSuccess = 0
            word.firstAttepmtSuccessStreak = 0
            word.score = 0;
        })
    }


    // importFromJson(json) {
    //     this.backupJson();
    //     //Verify for valid json
    //     JSON.stringify(json)
    //     this.#wordsMap = json;
    //     this.save();
    // }

    async importFromPlainText(value) {
        const newWords = value.split('\n');
        const prf = this.getPlainTextImportPrefix()
        if (newWords.shift()?.includes(prf)) {
            let newWrdCount = await this.addMany(newWords);
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
        const valTxts = values.map(v => v.word).join("\n");
        return this.getPlainTextImportPrefix() + "\n" + valTxts
    }

}

export default new WordService();