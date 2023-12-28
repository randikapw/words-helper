import { convertStringToJson, getItemFromLocalStorageAsJson, getToday, setItemFromJson } from "../utils";
import counterService from "./counterService";
import moment from "moment";
import todaySpecialService from "./todaySpecialService";
import userService, { getNewUserSeviceInstance } from "./userService";

// export const lcl_key = "Difficult_Words";
export const lcl_key = "difficultWords";
let today = getToday().toISOString();

class IrregularVerbService {

    #wordsMap = {}
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
    #lazyCountMax = 9;
    #lazyTimeout = 35000;
    #lazyTimeoutObj;

    constructor() {
        userService.subscribeOnUpdateUser((user)=>{
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
        const todaySpecials = todaySpecialService.getTodaySpecials(lcl_key);
        if (!todaySpecials.length) {
            const l = Math.min(sortedWords.length, 3);
            console.log("L is", l)
            for (let index = 0; index < l; index++) {
                todaySpecialService.addToTodaySpecials(lcl_key, sortedWords[index].english )
                
            console.log("i is", index)
            }
        }
        return sortedWords;
    }

    removeWord(word) {
        delete this.#wordsMap[word.english];
        this.save();
    }

    async updateWord(oldWord, newWord) {
        const wordsMap = this.#wordsMap;
        const examples = wordsMap[oldWord.english].examples;
        
        delete wordsMap[oldWord.english];
        const rootUserService = getNewUserSeviceInstance();
        const rootUsr = await rootUserService.loadUser("root");
        // const words = this.#wordsMap;
        const rootWords = convertStringToJson(rootUsr[lcl_key]);
        delete rootWords[oldWord.english];
        await rootUserService.upadteUserAttributes({[lcl_key]:JSON.stringify(rootWords)})
        
        newWord = newWord.replace( /\(#\)/g, '\t' );
        if (examples) newWord += "\t" + examples?.replaceAll('\n','(#nl#)');
        console.log(`updating ${newWord}`)
        await this.addMany([newWord]);
        
    }

    async updateExamples(word, examples) {
        const wordsMap = this.#wordsMap;
        wordsMap[word.english].examples = examples;
        // this.saveLazy();

        const rootUserService = getNewUserSeviceInstance();
        const rootUsr = await rootUserService.loadUser("root");
        // const words = this.#wordsMap;
        const rootWords = convertStringToJson(rootUsr[lcl_key]);
        rootWords[word.english].examples = examples;
        await rootUserService.upadteUserAttributes({[lcl_key]:JSON.stringify(rootWords)})
    }

    #reduceByWieght(marks) {
        if (marks < 1) return marks;
        if(--marks < 5) return marks;
        if(--marks < 10) return marks;
        if(--marks < 20) return marks;
        return --marks;
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
            if (score > 0) score = this.#reduceByWieght(score);
            if (wordObj[vTypeKey] > 0) wordObj[vTypeKey] = this.#reduceByWieght(wordObj[vTypeKey]);
        }
        
        this.#wordsMap[word.english] = {...wordObj, score, attempts}
        counterService.countAttempt(lcl_key,isFirstAttempt,isWrong);
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
            if (!(verbSplit.length === 3 || verbSplit.length === 4)) {
                const msg = `chunk ${verbsSet} doesnot contain 3 or 4 words separated by tabs!`
                alert(msg);
                throw new Error(msg);
            }
            const english = verbSplit[0].trim()?.toLocaleLowerCase();
            const sinhala = verbSplit[1].trim()?.toLocaleLowerCase();
            const comment = verbSplit[2].trim();
            const examples = verbSplit[3]?.replaceAll('(#nl#)','\n')?.trim();
            let w = words[english];
            if (!(w && w.english && w.sinhala)) {
                w = {...this.#newWordTemplate, english, sinhala, comment, examples};
                words[english] = w;
                this.#wordsMap[english] = w
                ++newWrdCount
            }
            if (examples && (!w.examples || !w.examples.includes(examples))) {
                if(w.examples) {
                    w.examples = `${examples}\n----\n${w.examples}`;
                } else {
                    w.examples = examples;
                }
                this.#wordsMap[english].examples = w.examples
            }
        });
        //this.save();
        await rootUserService.upadteUserAttributes({[lcl_key]:JSON.stringify(words)})
        return newWrdCount;
    }

    async save() {
        console.log("saving irregularVerbs data...",this.#wordsMap);
        // setItemFromJson(lcl_key,this.#wordsMap);
        await userService.upadteUserAttributes({[lcl_key]:JSON.stringify(this.#wordsMap)})
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

    getTodaySpecials() {
        return todaySpecialService.getTodaySpecials(lcl_key).map((key)=>this.#wordsMap[key]);
    }

    addToTodaySpecials(content) {
        //todo need to validate content
        todaySpecialService.addToTodaySpecials(lcl_key, content.english);
        alert(`The word '${content.english}' added to 'Today Specials'`)
    }

    
    exportJson() {
        return this.#wordsMap;
    }

    
    backupJson() {
        const backupKey = `back_${lcl_key}_${moment().toString()}`;
        setItemFromJson(backupKey,this.#wordsMap);
        console.log("#databackup on key: " + backupKey);
    }
    
    resetScore(json) {
        Object.values(json).forEach((word)=>{
          word.attempts = 0
          word.score = 0;
          word.score_e2s = 0;
          word.score_s2e = 0;
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
        if(newWords.shift()?.includes(prf)) {
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
        const valTxts = values.map(v=>`${v.english}\t${v.sinhala}\t${v.comment}\t${v.examples?.replaceAll('\n','(#nl#)') || ''}`).join("\n");
        return this.getPlainTextImportPrefix() + "\n" + valTxts
    }

}

export default new IrregularVerbService();