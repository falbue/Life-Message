export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function formatMessage(message) {
    const codeBlockPattern = /```(\w+)?\n?([\s\S]*?)```/g;
    let result = '';
    let lastIndex = 0;
    let match;
    const inlineCodePattern = /`([\s\S]+?)`/g;
    const boldPattern = /\*\*([\s\S]+?)\*\*/g;

    function formatTextWithBold(text) {
        // Ensure the regex starts from 0 each time
        boldPattern.lastIndex = 0;
        let out = '';
        let li = 0;
        let m;
        while ((m = boldPattern.exec(text)) !== null) {
            const before = text.slice(li, m.index);
            out += escapeHtml(before).replace(/\n/g, '<br>');
            const boldContent = m[1];
            const escapedBold = escapeHtml(boldContent).replace(/\n/g, '<br>');
            out += `<b>${escapedBold}</b>`;
            li = m.index + m[0].length;
        }
        const rest = text.slice(li);
        out += escapeHtml(rest).replace(/\n/g, '<br>');
        return out;
    }

    function formatSegmentWithInlineCode(segment) {
        // Reset regex state before using exec in a loop
        inlineCodePattern.lastIndex = 0;
        let out = '';
        let li = 0;
        let m;
        while ((m = inlineCodePattern.exec(segment)) !== null) {
            const beforeSeg = segment.slice(li, m.index);
            // Format text parts (handles bold and escaping)
            out += formatTextWithBold(beforeSeg);
            const codeContent = m[1];
            const escapedCode = escapeHtml(codeContent).replace(/\n/g, '<br>');
            out += `<i class="inline copy">${escapedCode}</i>`;
            li = m.index + m[0].length;
        }
        const restSeg = segment.slice(li);
        out += formatTextWithBold(restSeg);
        return out;
    }

    while ((match = codeBlockPattern.exec(message)) !== null) {
        const [full, lang, code] = match;
        const before = message.slice(lastIndex, match.index);
        result += formatSegmentWithInlineCode(before);
        const langClass = lang ? `language-${lang}` : '';
        const escapedCode = escapeHtml(code);
        result += `<pre><code class="${langClass} copy">${escapedCode}</code></pre>`;
        lastIndex = match.index + full.length;
    }

    const rest = message.slice(lastIndex);
    result += formatSegmentWithInlineCode(rest);
    return result;
}