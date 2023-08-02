import { getItemAsJson, getToday, setItemFromJson } from "../utils";

const lcl_key = "today_special_data";

class TodaySpecialService {
    #tsDataMap
    
    #tsTemplate = {
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
        this.#tsDataMap = getItemAsJson(lcl_key);
    }

    #getTodaySpecials(key) {
        const today = getToday().toISOString();
        let todaySpFull = this.#tsDataMap[today];
        if (!todaySpFull) {
            todaySpFull = {};
            this.#tsDataMap[today] = todaySpFull;
        }

        let todaySpkey = todaySpFull[key];
        if (!todaySpkey){
            todaySpkey = []
            todaySpFull[key] = todaySpkey;
        }
        return todaySpkey;
    }

    getTodaySpecials(key) {
        return [...this.#getTodaySpecials(key)]
    }

    addToTodaySpecials(key, value) {
        const tsps = this.#getTodaySpecials(key);
        tsps.push(value);
        this.saveLazy();
    }

    

    save() {
        console.log("saving counter data...",this.#tsDataMap);
        setItemFromJson(lcl_key,this.#tsDataMap);
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

export default new TodaySpecialService();