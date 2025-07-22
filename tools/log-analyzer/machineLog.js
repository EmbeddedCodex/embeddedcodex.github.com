function analyzeMachineLog(arrayBuffer) {
    // 示例：简单解析机台日志
    const bytes = new Uint8Array(arrayBuffer);
    // 示例：简单解析机台日志
    const decoder = new TextDecoder('GB2312');
    const text = decoder.decode(bytes);

    // 深化应用
    // 定义测试项及其对应的正则表达式
    const testItems = [
        '台区户变关系识别',
        '相位识别',
        '停电上报',
        '精准对时',
        '资产管理',
        '万年历同步',
        '负荷曲线采集与存储'
    ];

    const testFunctions = {
        '台区户变关系识别': analyzeFeederTransformerRelationship,
        '相位识别': analyzePhaseIdentification,
        '停电上报': analyzePowerOutageReporting,
        '精准对时': analyzePreciseTiming,
        '资产管理': analyzeAssetManagement,
        '万年历同步': analyzePerpetualCalendarSync,
        '负荷曲线采集与存储': analyzeLoadCurveCollection
    };

    // 创建一个对象来存储每个测试项的内容
    const testResults = {};

    // 遍历每个测试项，提取其内容
    testItems.forEach((item) => {

        const startMarker = `********${item}测试开始********`;
        const endMarker = `********${item}测试结束********`;

        // 转义特殊字符
        const escapedStartMarker = startMarker.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const escapedEndMarker = endMarker.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

        const regex = new RegExp(`(?<=${escapedStartMarker})(.*?)(?=${escapedEndMarker})`, 'gms');

        const matches = text.match(regex);

        if (matches) {
            // testResults[item] = matches.map((match) => match.trim());
            // 遍历 matches 数组
            testResults[item] = matches.flatMap((match) => {
                // 检查 match 是否包含 escapedStartMarker
                if (match.includes(startMarker)) {
                    // 如果包含，按 escapedStartMarker 分段
                    return match.split(startMarker).map((segment) => segment.trim());
                } else {
                    // 如果不包含，直接返回去除空白的 match
                    return [match.trim()];
                }
            });
        } else {
            testResults[item] = [];
        }
    });

    // 打印结果
    for (const [item, results] of Object.entries(testResults)) {
        console.log(`${item}测试结果：`);
        if (results.length > 0) {
            results.forEach((result, index) => {
                console.log(`第${index + 1}次测试：`);
                // console.log(result);
                let summary = result.slice(0, 100) + (result.length > 100 ? "..." : "");
                console.log(summary);
                console.log(`总长度: ${result.length}`);
                console.log('--------------------------');
            });
        } else {
            console.log('未找到该测试项的内容');
        }
    }

    // 循环调用每个测试项目的处理函数
    testItems.forEach((item) => {
        if (testFunctions[item] && testResults[item]) {
            testFunctions[item](testResults[item]);
        } else {
            console.warn(`未找到处理函数或日志数据：${item}`);
        }
    });

    // return text.split('\n').map(line => `${line}`).join('\n');
}


// 定义测试项目的处理函数
function analyzeFeederTransformerRelationship(log) {
    // 处理“台区户变关系识别”的逻辑
    console.log("处理台区户变关系识别的逻辑");
    // 示例：提取和处理相关数据
    // const results = log.match(/相关的正则表达式/g);
    // return results;
    log.forEach((result, index) => {
        console.log(`第${index + 1}次测试：`);
        // console.log(result);
        let summary = result.slice(0, 100) + (result.length > 100 ? "..." : "");
        console.log(summary);
        console.log(`总长度: ${result.length}`);
        console.log('--------------------------');
    });
}

function analyzePhaseIdentification(log) {
    // 处理“相位识别”的逻辑
    console.log("处理相位识别的逻辑");
    // 示例：提取和处理相关数据
    // const results = log.match(/相关的正则表达式/g);
    // return results;
}

function analyzePowerOutageReporting(log) {
    // 处理“停电上报”的逻辑
    console.log("处理停电上报的逻辑");
    // 示例：提取和处理相关数据
    // const results = log.match(/相关的正则表达式/g);
    // return results;
}

function analyzePreciseTiming(log) {
    // 处理“精准对时”的逻辑
    console.log("处理精准对时的逻辑");
    // 示例：提取和处理相关数据
    // const results = log.match(/相关的正则表达式/g);
    // return results;
}

function analyzeAssetManagement(log) {
    // 处理“资产管理”的逻辑
    console.log("处理资产管理的逻辑");
    // 示例：提取和处理相关数据
    // const results = log.match(/相关的正则表达式/g);
    // return results;
}

function analyzePerpetualCalendarSync(log) {
    // 处理“万年历同步”的逻辑
    console.log("处理万年历同步的逻辑");
    // 示例：提取和处理相关数据
    // const results = log.match(/相关的正则表达式/g);
    // return results;
}

function analyzeLoadCurveCollection(log) {
    // 处理“负荷曲线采集与存储”的逻辑
    console.log("处理负荷曲线采集与存储的逻辑");
    // 示例：提取和处理相关数据
    // const results = log.match(/相关的正则表达式/g);
    // return results;
    log.forEach((result, index) => {
        console.log(`第${index + 1}次测试：`);
        // console.log(result);
        let summary = result.slice(0, 100) + (result.length > 100 ? "..." : "");
        console.log(summary);
        console.log(`总长度: ${result.length}`);
        console.log('--------------------------');
    });
}

// 暴露处理函数
export { analyzeMachineLog };
