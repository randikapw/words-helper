import { model, models, Schema } from "mongoose";

const userSchema = new Schema({
    userName: String,
    email: String,
    password: String,
    spellings: String,
    irregular: String,
    difficultWords: String,
    dailyCountData: String,
    todaySpecialData: String,
});


export const  Users = models.user || model('user', userSchema);