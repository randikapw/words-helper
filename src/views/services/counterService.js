'use client'

import { convertStringToJson, getItemFromLocalStorageAsJson, getToday, setItemFromJson } from "../utils";
import userService from "./userService"

const lcl_key = "dailyCountData";

class CounterService {
    #countDataMap = {}
    
    #counterTemplate = {
        uniqueAttempts: 0,
        retries: 0,
        firstAttemptSuccess: 0,
        reattemptFails: 0
    }
    
    #lazyCount = 0;
    #lazyCountMax = 7;
    #lazyTimeout = 35000;
    #lazyTimeoutObj;

    constructor() {
        userService.subscribeOnUpdateUser((user)=>{
            this.#countDataMap = convertStringToJson(user[lcl_key]);
        })
        // this.#countDataMap = getItemFromLocalStorageAsJson(lcl_key);
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
        userService.upadteUserAttributes({[lcl_key]:JSON.stringify(this.#countDataMap)})
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