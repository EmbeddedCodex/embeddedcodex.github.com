self.onmessage = function (event) {
    const { file, logType } = event.data;
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);

    reader.onload = function (event) {
        const arrayBuffer = event.target.result;
        const result = parseLogFile(arrayBuffer, logType);
        // self.postMessage({ result });
        console.log(result);

        // 将结果分段发送到主线程
        const chunkSize = 20*1024; // 每次发送的数据量
        let index = 0;

        const sendNextChunk = () => {
            const chunk = result.slice(index, index + chunkSize);
            self.postMessage({ chunk });

            index += chunkSize;
            if (index < result.length) {
                // 使用 setTimeout 来分段发送，避免阻塞主线程
                setTimeout(sendNextChunk, 0);
            } else {
                self.postMessage({ done: true }); // 通知主线程数据发送完成
            }
        };

        self.postMessage({ start: true }); // 通知主线程数据发送开始
        sendNextChunk();
    };

    reader.onerror = function (event) {
        self.postMessage({ error: '读取文件失败' });
    };
};

function parseLogFile(arrayBuffer, logType) {
    let result = '';

    if (logType === 'machine-log') {
        result = analyzeMachineLog(arrayBuffer);
    } else if (logType === 'module-log-txt') {
        result = analyzeModuleLogTxt(arrayBuffer);
    } else if (logType === 'module-log-bin') {
        result = analyzeModuleLogBin(arrayBuffer);
    }

    return result;
}

function analyzeMachineLog(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    // 示例：简单解析机台日志
    const decoder = new TextDecoder('GB2312');
    const text = decoder.decode(bytes);
    return text.split('\n').map(line => `${line}`).join('\n');
}

function analyzeModuleLogTxt(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    // 示例：简单解析模块日志 (txt)
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(bytes);
    return text.split('\n').map(line => `${line}`).join('\n');
}

function analyzeModuleLogBin(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    // 示例：简单解析模块日志 (bin)
    return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join(' ');
}