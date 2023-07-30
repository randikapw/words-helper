import { getItemAsJson, getToday, setItemFromJson } from "../utils";

const lcl_key = "daily_count_data";

class CounterService {
    #countDataMap
    
    #counterTemplate = {
        uniqueAttempts: 0,
        retries: 0,
        firstAttemptSuccess: 0,
        reattemptFails: 0
    }
    
    #lazyCount = 0;
    #lazyCountMax = 5;
    #lazyTimeout = 15000;
    #lazyTimeoutObj;

    constructor() {
        this.#countDataMap = getItemAsJson(lcl_key);
    }

    #getTodayCounts(key) {
        const today = getToday().toISOString();
        let todayc = this.#countDataMap[today];
        if (!todayc) {
            todayc = {}
            this.#countDataMap[today] = todayc;
        }

        let todayCkey = todayc[key];
        if (!todayCkey){
            todayCkey = {...this.#counterTemplate}
            todayc[key] = todayCkey;
        }
        return todayCkey;
    }

    getCounts(key) {
        return {...this.#getTodayCounts(key)}
    }

    countAttempt(key, isFirstAttempt, isWrong) {
        let {uniqueAttempts,retries, reattemptFails,firstAttemptSuccess} = this.#getTodayCounts(key);
        const tcounts = this.#getTodayCounts(key);
        if (!isFirstAttempt){
            ++tcounts.retries;
            if (isWrong) ++reattemptFails;
        } else {
            ++tcounts.uniqueAttempts;
            if (!isWrong) ++firstAttemptSuccess;
        }
        this.saveLazy();
    }

    

    save() {
        console.log("saving counter data...",this.#countDataMap);
        setItemFromJson(lcl_key,this.#countDataMap);
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
}

export default new CounterService();