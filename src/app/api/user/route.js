import { Users } from "../../../db/user-model"
import connectMongo from "../../../db/mongoConnect"
import {mergeDifficultWords, mergeIrregular, mergeSpellings} from "./userApiUtils"


export async function GET(request) {
    await connectMongo();
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user')

    const data = await await Users.findOne({ userName: userId })

    return Response.json({ data })
}

export async function PUT(request) {
    // spellings: String,
    // irregular: String,
    // difficultWords: String,
    await connectMongo();
    
    //body
    const updateData = await request.json()
    const userId = updateData.userName;
    if (userId !== "root") {
        const rootdata = await Users.findOne({ userName: 'root' })
        if (updateData.spellings) {
            updateData.spellings = mergeSpellings(rootdata.spellings,updateData.spellings)
        }
        if (updateData.irregular) {
            updateData.irregular = mergeIrregular(rootdata.irregular,updateData.irregular)
        }
        if (updateData.difficultWords) {
            updateData.difficultWords = mergeDifficultWords(rootdata.difficultWords,updateData.difficultWords)
        }
    }

    const data = await Users.findOneAndUpdate({ userName: userId },updateData,{new: true, upsert: true})

    return Response.json({ data })

}