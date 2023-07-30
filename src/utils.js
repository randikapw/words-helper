import moment from "moment/moment";

export function getItemAsJson(key) {
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