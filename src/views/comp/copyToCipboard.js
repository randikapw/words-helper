import { useState } from "react";

export const CopyText = ({textToCopy, label}) => {
    const [isCoppied, setIsCoppied]  = useState(false);

    const onCopy = () => {
        navigator.clipboard.writeText(textToCopy);
        setIsCoppied(true);
        setTimeout(() => setIsCoppied(false), 3000);
    }
    return <span onClick={onCopy}>
        {isCoppied?'✔':label ||'copy'}
    </span>
}