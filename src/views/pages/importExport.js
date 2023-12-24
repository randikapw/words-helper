import { useState } from "react";
import { RadioButton } from "../comp/radiobutton";
import wordsService, { lcl_key as spell_lcl_key } from "../services/wordsService";
import irregularVerbService, { lcl_key as irregular_lcl_key } from "../services/irregularVerbService";
import difficultWordService, { lcl_key } from "../services/difficultWordService";

const action_import = "import";
const action_export = "export";

const format_json = "json";
const format_plain = "plain";

const content_all = "All";
const content_spelleings = "Spellings";
const content_irreugler = "Irregular_Verbs";
const content_difficult = "Difficult_Words";

const ImportExport = () => {

    const [action, setAction] = useState(action_import);
    const [format, setFormat] = useState(format_json);
    const [content, setContent] = useState(content_all);
    const [showTex, setShowText] = useState(true);
    const [value, setValue] = useState("");


    const onEnterPress = (e) => {
        if (e === "click" || e.keyCode == 13 && e.shiftKey == false) {
            if (e.preventDefault) e.preventDefault();
            switch (action) {
                case action_export:
                    exportData();
                    break;

                case action_import:
                    importData();
                    break;
            }
            // let words = difficultWordService.getWordsMap();
            // const newWords = value.split('\n');
            // let newWrdCount = difficultWordService.addMany(newWords);
            // alert(`${newWrdCount} difficult workds imported`);
        }
    }

    const exportData = () => {
        switch (format) {
            case format_json:
                exportJson();
                break;
            case format_plain:
                exportPlainText();
                break;
        }
        setShowText(true);
    }

    const importData = () => {
        switch (format) {
            case format_json:
                return importJson(content);
            default:
                return getContentService(content).importFromPlainText(value);
        }
    }


    const importJson = async () => {
        try {
            const importJson = JSON.parse(value);

            if (content === content_all) {
                const userName = importJson['userName'];
                if (!userName) throw new Error("import data does not contain 'userName'")
                const spellJson = importJson[content_spelleings];
                const irregJson = importJson[content_irreugler];
                const diffJson = importJson[content_difficult];
                if (spellJson && irregJson && diffJson) {
                    // wordsService.importFromJson(spellJson);
                    // irregularVerbService.importFromJson(irregJson);
                    // difficultWordService.importFromJson(diffJson);
                    const body = {
                        userName,
                        spellings: JSON.stringify(spellJson),
                        irregular: JSON.stringify(irregJson),
                        difficultWords: JSON.stringify(diffJson),
                    }
                    const response = await fetch("/api/user", {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    if (!response.ok) {
                        throw new Error("user PUT request failed!")
                    }
                } else {
                    alert("Import failed, Seems one of data not available");
                    console.error("Import failed, Seems one of data not available");
                    return;
                }
            } else {
                const iJson = importJson[content];
                if (iJson) {
                    getContentService(content).importFromJson(iJson);
                } else {
                    alert(`Import failed, Seems data with attribute '${content}' is not available`);
                    console.error(`Import failed, Seems data with attribute '${content}' is not available`);
                    return;
                }

            }
            alert ("Import successful!")
        } catch (error) {
            alert(error.message);
            console.error(error);
        }

    }



    const exportJson = () => {
        if (content === content_all) {
            const xj = {};
            xj[content_spelleings] = wordsService.exportJson();
            xj[content_irreugler] = irregularVerbService.exportJson();;
            xj[content_difficult] = difficultWordService.exportJson();;

            const xjs = JSON.stringify(xj);
            setValue(xjs);
        } else {
            const xj = {};
            xj[content] = getContentService(content).exportJson();
            const xjs = JSON.stringify(xj);
            setValue(xjs);
        }

    }

    const exportPlainText = () => {
        const exoportTxt = getContentService(content).exportToPlainText();
        setValue(exoportTxt);
    }

    const getContentService = (content) => {
        switch (content) {
            case content_spelleings:
                return wordsService;
            case content_irreugler:
                return irregularVerbService;
            case content_difficult:
                return difficultWordService;
        }
    }

    const actionChangeHandler = (e) => {
        const a = e.target.value;
        switch (a) {
            case action_import:
                setShowText(true);
                break;
            default:
                setShowText(false);
                break;
        }
        setValue("")
        setAction(a);
    };


    const formatChangeHandler = (e) => {
        const f = e.target.value;
        setFormat(f);
        if (f !== format_json && content === content_all) {
            setContent(content_spelleings);
        }
    };

    const contentChangeHandler = (e) => {
        setContent(e.target.value);
    };

    return <div className="group">
        <div className="group">
            <h1>Import | Export | Backup</h1>
            <div className="group">
                {/* <h2>Import or export?</h2> */}
                <div>Import or export?</div>
                <div className="radio-btn-container" style={{ display: "flex" }}>
                    <RadioButton
                        changed={actionChangeHandler}
                        id="1"
                        isSelected={action === action_import}
                        label={action_import}
                        value={action_import}
                    />
                    <RadioButton
                        changed={actionChangeHandler}
                        id="1"
                        isSelected={action === action_export}
                        label={action_export}
                        value={action_export}
                    />
                </div>
            </div>


            <div className="group">
                {/* <h2>which format?</h2> */}
                <div>which format?</div>
                <div className="radio-btn-container" style={{ display: "flex" }}>
                    <RadioButton
                        changed={formatChangeHandler}
                        id="1"
                        isSelected={format === format_json}
                        label={format_json}
                        value={format_json}
                    />
                    <RadioButton
                        changed={formatChangeHandler}
                        id="1"
                        isSelected={format === format_plain}
                        label={format_plain}
                        value={format_plain}
                    />
                </div>
            </div>


            <div className="group">
                {/* <h2>which format?</h2> */}
                <div>which content?</div>
                <div className="radio-btn-container" style={{ display: "flex" }}>
                    {(format === format_json) && <RadioButton
                        changed={contentChangeHandler}
                        id="1"
                        isSelected={content === content_all}
                        label={content_all}
                        value={content_all}
                    />}
                    <RadioButton
                        changed={contentChangeHandler}
                        id="1"
                        isSelected={content === content_spelleings}
                        label={content_spelleings}
                        value={content_spelleings}
                    />
                    <RadioButton
                        changed={contentChangeHandler}
                        id="1"
                        isSelected={content === content_irreugler}
                        label={content_irreugler}
                        value={content_irreugler}
                    />
                    <RadioButton
                        changed={contentChangeHandler}
                        id="1"
                        isSelected={content === content_difficult}
                        label={content_difficult}
                        value={content_difficult}
                    />
                </div>
            </div>

            {showTex && <div className="group">
                <textarea
                    rows="10"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={onEnterPress}
                ></textarea>
            </div>
            }
            <div className="group options">
                <button onClick={() => onEnterPress("click")}>{action}</button>
            </div>
        </div>

    </div>
}
export default ImportExport; 