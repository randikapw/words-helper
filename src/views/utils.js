'use client'

import moment from "moment/moment";

export function convertStringToJson(content, defaultValue={}) {
    if(content) return JSON.parse(content);
    return defaultValue;
}

export function getItemFromLocalStorageAsJson(key) {
    let words = localStorage.getItem(key);
    //converting words to json and assiging to itself
    words = words !== null ? JSON.parse(words) : {};
    return words;
}

export function setItemFromJson(key, validJson) {
    localStorage.setItem(key, JSON.stringify(validJson));
}

export function getToday() {
    return moment().startOf('day');
}
