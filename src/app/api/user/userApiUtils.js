export function mergeSpellings(rootCollectionStr, userCollectionStr){
    const rootCollection = JSON.parse(rootCollectionStr);
    const userCollection = JSON.parse(userCollectionStr);
    //{\"incorporating\":{\"word\":\"incorporating\",\"attempts\":23,\"score\":2,\"date\":\"2023-09-27T18:30:00.000Z\"}
    Object.entries(rootCollection).forEach(([key, record]) => {
        const userRecord = userCollection[key]
        if (userRecord) {
            record.attempts = userRecord.attempts || 0;
            record.score = userRecord.score ?? 0;
            if (userRecord.date) record.date = userRecord.date;
        }
    });
    return JSON.stringify(rootCollection)
}

export function mergeIrregular(rootCollectionStr, userCollectionStr){
    const rootCollection = JSON.parse(rootCollectionStr);
    const userCollection = JSON.parse(userCollectionStr);
    //\"build\":{\"v1\":\"build\",\"v2\":\"built\",\"v3\":\"built\",\"attempts\":7,\"score\":0,\"score_v1\":0,\"score_v2\":0,\"score_v3\":0,\"date\":\"2023-08-07T18:30:00.000Z\"}
    Object.entries(rootCollection).forEach(([key, record]) => {
        const userRecord = userCollection[key]
        if (userRecord) {
            record.attempts = userRecord.attempts || 0;
            record.score = userRecord.score ?? 0;
            record.score_v1 = userRecord.score_v1 ?? 0;
            record.score_v2 = userRecord.score_v2 ?? 0;
            record.score_v3 = userRecord.score_v3 ?? 0;
            if (userRecord.date) record.date = userRecord.date;
        }
    });
    return JSON.stringify(rootCollection)
}


export function mergeDifficultWords(rootCollectionStr, userCollectionStr){
    const rootCollection = JSON.parse(rootCollectionStr);
    const userCollection = JSON.parse(userCollectionStr);
    //\"build\":{\"v1\":\"build\",\"v2\":\"built\",\"v3\":\"built\",\"attempts\":7,\"score\":0,\"score_v1\":0,\"score_v2\":0,\"score_v3\":0,\"date\":\"2023-08-07T18:30:00.000Z\"}
    Object.entries(rootCollection).forEach(([key, record]) => {
        const userRecord = userCollection[key]
        if (userRecord) {
            record.attempts = userRecord.attempts || 0;
            record.score = userRecord.score ?? 0;
            record.score_v1 = userRecord.score_v1 ?? 0;
            record.score_v2 = userRecord.score_v2 ?? 0;
            record.score_v3 = userRecord.score_v3 ?? 0;
            if (userRecord.date) record.date = userRecord.date;
        }
    });
    return JSON.stringify(rootCollection)
}

